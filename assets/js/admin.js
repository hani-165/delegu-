document.addEventListener("DOMContentLoaded", async () => {
  const store = window.PortailStore;

  const elements = {
    gate: document.getElementById("admin-gate"),
    configWarning: document.getElementById("admin-config-warning"),
    loginCard: document.getElementById("admin-login-card"),
    app: document.getElementById("admin-app"),
    loginForm: document.getElementById("admin-login-form"),
    loginError: document.getElementById("login-error"),
    logoutButton: document.getElementById("admin-logout"),
    documentForm: document.getElementById("document-form"),
    fileInput: document.getElementById("doc-file"),
    selectedFile: document.getElementById("selected-file"),
    documentsList: document.getElementById("admin-documents-list"),
    documentsEmpty: document.getElementById("admin-documents-empty"),
    announcementsList: document.getElementById("admin-announcements-list"),
    announcementsEmpty: document.getElementById("admin-announcements-empty"),
    announcementForm: document.getElementById("announcement-form"),
    changePasswordForm: document.getElementById("change-password-form"),
    docCount: document.getElementById("admin-doc-count"),
    subjectCount: document.getElementById("admin-subject-count"),
    announcementCount: document.getElementById("admin-announcement-count"),
  };

  if (!store.isConfigured()) {
    elements.gate.hidden = false;
    elements.configWarning.hidden = false;
    elements.loginCard.hidden = true;
    elements.app.hidden = true;
    return;
  }

  const state = { documents: [], announcements: [] };

  function subjectsCount() {
    return new Set(state.documents.map((item) => item.subject).filter(Boolean))
      .size;
  }

  function updateStats() {
    elements.docCount.textContent = state.documents.length.toString();
    elements.subjectCount.textContent = subjectsCount().toString();
    elements.announcementCount.textContent =
      state.announcements.length.toString();
  }

  function showApp() {
    elements.gate.hidden = true;
    elements.app.hidden = false;
  }

  function showLogin() {
    elements.gate.hidden = false;
    elements.loginCard.hidden = false;
    elements.app.hidden = true;
  }

  function renderDocuments() {
    elements.documentsList.innerHTML = "";
    elements.documentsEmpty.hidden = state.documents.length > 0;

    state.documents.forEach((item) => {
      const article = document.createElement("article");
      article.className = "document-item";
      const extension = store.getExtension(item.file_name);
      article.innerHTML = `
        <div class="document-row">
          <div class="document-icon" data-ext="${extension}">${extension}</div>
          <div class="document-main">
            <div class="document-badges">
              <span class="meta-badge">${item.category}</span>
            </div>
            <h3>${item.title}</h3>
            <p class="document-meta">
              <span>Matière: ${item.subject}</span>
              <span>Professeur: ${item.teacher}</span>
              <span>Ajouté le ${store.formatDate(item.created_at)}</span>
              <span>${store.formatFileSize(item.file_size)}</span>
            </p>
            ${item.description ? `<p class="document-description">${item.description}</p>` : ""}
          </div>
        </div>
        <div class="document-actions">
          <button class="button button-secondary" type="button" data-download="${item.id}">Télécharger</button>
          <button class="button button-danger" type="button" data-delete-document="${item.id}" data-file-path="${item.file_path}">Supprimer</button>
        </div>
      `;
      elements.documentsList.appendChild(article);
    });

    elements.documentsList
      .querySelectorAll("[data-download]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const item = state.documents.find(
            (doc) => doc.id === button.dataset.download,
          );
          if (item) {
            store.downloadDocument(item);
          }
        });
      });

    elements.documentsList
      .querySelectorAll("[data-delete-document]")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          const confirmed = window.confirm("Supprimer ce document ?");
          if (!confirmed) {
            return;
          }

          try {
            await store.deleteDocument(
              button.dataset.deleteDocument,
              button.dataset.filePath,
            );
            await refresh();
          } catch (error) {
            window.alert(
              "Suppression impossible: " + (error.message || "erreur inconnue"),
            );
          }
        });
      });
  }

  function renderAnnouncements() {
    elements.announcementsList.innerHTML = "";
    elements.announcementsEmpty.hidden = state.announcements.length > 0;

    state.announcements.forEach((announcement) => {
      const article = document.createElement("article");
      article.className = "announcement-item";
      article.innerHTML = `
        <h3>${announcement.title}</h3>
        <p>${announcement.message}</p>
        <span class="announcement-date">${store.formatDate(announcement.date)}</span>
        <div class="document-actions">
          <button class="button button-danger" type="button" data-delete-announcement="${announcement.id}">Supprimer</button>
        </div>
      `;
      elements.announcementsList.appendChild(article);
    });

    elements.announcementsList
      .querySelectorAll("[data-delete-announcement]")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          const confirmed = window.confirm("Supprimer cette annonce ?");
          if (!confirmed) {
            return;
          }

          try {
            await store.deleteAnnouncement(button.dataset.deleteAnnouncement);
            await refresh();
          } catch (error) {
            window.alert(
              "Suppression impossible: " + (error.message || "erreur inconnue"),
            );
          }
        });
      });
  }

  async function refresh() {
    try {
      state.documents = await store.getDocuments();
      state.announcements = await store.getAnnouncements();
    } catch (error) {
      console.error(error);
      return;
    }

    updateStats();
    renderDocuments();
    renderAnnouncements();
  }

  async function handleSession(session) {
    if (session) {
      showApp();
      await refresh();
    } else {
      showLogin();
    }
  }

  elements.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    elements.loginError.hidden = true;

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try {
      await store.signIn(email, password);
      elements.loginForm.reset();
    } catch (error) {
      elements.loginError.textContent =
        "Connexion refusée. Vérifiez l'identifiant et le mot de passe.";
      elements.loginError.hidden = false;
    }
  });

  elements.logoutButton.addEventListener("click", async () => {
    await store.signOut();
  });

  elements.fileInput.addEventListener("change", () => {
    const file = elements.fileInput.files && elements.fileInput.files[0];
    elements.selectedFile.textContent = file
      ? `${file.name} — ${store.formatFileSize(file.size)}`
      : "Aucun fichier sélectionné.";
  });

  elements.documentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const file = elements.fileInput.files && elements.fileInput.files[0];
    if (!file) {
      window.alert("Veuillez sélectionner un fichier.");
      return;
    }

    const submitButton = elements.documentForm.querySelector(
      'button[type="submit"]',
    );
    const originalLabel = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Publication en cours...";

    try {
      await store.addDocument({
        title: document.getElementById("doc-title").value.trim(),
        subject: document.getElementById("doc-subject").value.trim(),
        teacher: document.getElementById("doc-teacher").value.trim(),
        category: document.getElementById("doc-category").value,
        description: document.getElementById("doc-description").value.trim(),
        file,
      });

      elements.documentForm.reset();
      elements.selectedFile.textContent = "Aucun fichier sélectionné.";
      await refresh();
    } catch (error) {
      window.alert(
        "Publication impossible: " + (error.message || "erreur inconnue"),
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  });

  elements.announcementForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await store.addAnnouncement({
        title: document.getElementById("announcement-title").value.trim(),
        message: document.getElementById("announcement-message").value.trim(),
        date: document.getElementById("announcement-date").value,
      });

      elements.announcementForm.reset();
      await refresh();
    } catch (error) {
      window.alert(
        "Publication impossible: " + (error.message || "erreur inconnue"),
      );
    }
  });

  elements.changePasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const newPassword = document
      .getElementById("new-admin-password")
      .value.trim();

    if (newPassword.length < 6) {
      window.alert("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    try {
      await store.updatePassword(newPassword);
      elements.changePasswordForm.reset();
      window.alert("Mot de passe mis à jour.");
    } catch (error) {
      window.alert(
        "Mise à jour impossible: " + (error.message || "erreur inconnue"),
      );
    }
  });

  const session = await store.getSession();
  await handleSession(session);
  store.onAuthStateChange(handleSession);
  store.subscribeToChanges(async () => {
    if (!elements.app.hidden) {
      await refresh();
    }
  });
});
