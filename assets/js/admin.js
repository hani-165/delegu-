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
    documentFormTitle: document.getElementById("document-form-title"),
    documentSubmitButton: document.getElementById("document-submit-button"),
    cancelDocumentEdit: document.getElementById("cancel-document-edit"),
    fileInput: document.getElementById("doc-file"),
    selectedFile: document.getElementById("selected-file"),
    documentsList: document.getElementById("admin-documents-list"),
    documentsEmpty: document.getElementById("admin-documents-empty"),
    announcementsList: document.getElementById("admin-announcements-list"),
    announcementsEmpty: document.getElementById("admin-announcements-empty"),
    announcementForm: document.getElementById("announcement-form"),
    announcementFormTitle: document.getElementById("announcement-form-title"),
    announcementSubmitButton: document.getElementById(
      "announcement-submit-button",
    ),
    cancelAnnouncementEdit: document.getElementById("cancel-announcement-edit"),
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
  let editingDocumentId = null;
  let editingDocumentFilePath = null;
  let editingAnnouncementId = null;

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

  function resetDocumentForm() {
    editingDocumentId = null;
    editingDocumentFilePath = null;
    elements.documentForm.reset();
    elements.fileInput.required = true;
    elements.selectedFile.textContent = "Aucun fichier sélectionné.";
    elements.documentFormTitle.textContent = "Ajouter un document";
    elements.documentSubmitButton.textContent = "Publier le document";
    elements.cancelDocumentEdit.hidden = true;
  }

  function startEditDocument(item) {
    editingDocumentId = item.id;
    editingDocumentFilePath = item.file_path;

    document.getElementById("doc-title").value = item.title;
    document.getElementById("doc-subject").value = item.subject;
    document.getElementById("doc-teacher").value = item.teacher;
    document.getElementById("doc-category").value = item.category;
    document.getElementById("doc-description").value = item.description || "";
    elements.fileInput.value = "";
    elements.fileInput.required = false;
    elements.selectedFile.textContent = `Fichier actuel : ${item.file_name}. Choisissez un nouveau fichier pour le remplacer, ou laissez ce champ vide pour le conserver.`;

    elements.documentFormTitle.textContent = "Modifier le document";
    elements.documentSubmitButton.textContent = "Mettre à jour le document";
    elements.cancelDocumentEdit.hidden = false;

    elements.documentForm.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function resetAnnouncementForm() {
    editingAnnouncementId = null;
    elements.announcementForm.reset();
    elements.announcementFormTitle.textContent = "Publier une annonce";
    elements.announcementSubmitButton.textContent = "Publier l'annonce";
    elements.cancelAnnouncementEdit.hidden = true;
  }

  function startEditAnnouncement(announcement) {
    editingAnnouncementId = announcement.id;

    document.getElementById("announcement-title").value = announcement.title;
    document.getElementById("announcement-message").value =
      announcement.message;
    document.getElementById("announcement-date").value = announcement.date;

    elements.announcementFormTitle.textContent = "Modifier l'annonce";
    elements.announcementSubmitButton.textContent = "Mettre à jour l'annonce";
    elements.cancelAnnouncementEdit.hidden = false;

    elements.announcementForm.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
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
          <button class="button button-secondary" type="button" data-edit-document="${item.id}">Modifier</button>
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
      .querySelectorAll("[data-edit-document]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const item = state.documents.find(
            (doc) => doc.id === button.dataset.editDocument,
          );
          if (item) {
            startEditDocument(item);
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
            if (editingDocumentId === button.dataset.deleteDocument) {
              resetDocumentForm();
            }

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
        <div class="announcement-head">
          <h3>${announcement.title}</h3>
          <span class="announcement-date">${store.formatDate(announcement.date)}</span>
        </div>
        <p>${announcement.message}</p>
        <div class="document-actions">
          <button class="button button-secondary" type="button" data-edit-announcement="${announcement.id}">Modifier</button>
          <button class="button button-danger" type="button" data-delete-announcement="${announcement.id}">Supprimer</button>
        </div>
      `;
      elements.announcementsList.appendChild(article);
    });

    elements.announcementsList
      .querySelectorAll("[data-edit-announcement]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const announcement = state.announcements.find(
            (item) => item.id === button.dataset.editAnnouncement,
          );
          if (announcement) {
            startEditAnnouncement(announcement);
          }
        });
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
            if (editingAnnouncementId === button.dataset.deleteAnnouncement) {
              resetAnnouncementForm();
            }

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
    if (file) {
      elements.selectedFile.textContent = `${file.name} — ${store.formatFileSize(file.size)}`;
    } else if (!editingDocumentId) {
      elements.selectedFile.textContent = "Aucun fichier sélectionné.";
    }
  });

  elements.documentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const file = elements.fileInput.files && elements.fileInput.files[0];
    if (!editingDocumentId && !file) {
      window.alert("Veuillez sélectionner un fichier.");
      return;
    }

    const isEditing = Boolean(editingDocumentId);
    const submitButton = elements.documentSubmitButton;
    submitButton.disabled = true;
    submitButton.textContent = isEditing
      ? "Mise à jour en cours..."
      : "Publication en cours...";

    const payload = {
      title: document.getElementById("doc-title").value.trim(),
      subject: document.getElementById("doc-subject").value.trim(),
      teacher: document.getElementById("doc-teacher").value.trim(),
      category: document.getElementById("doc-category").value,
      description: document.getElementById("doc-description").value.trim(),
      file: file || null,
    };

    try {
      if (isEditing) {
        await store.updateDocument(editingDocumentId, {
          ...payload,
          previousFilePath: file ? editingDocumentFilePath : null,
        });
      } else {
        await store.addDocument(payload);
      }

      resetDocumentForm();
      submitButton.disabled = false;
      await refresh();
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = isEditing
        ? "Mettre à jour le document"
        : "Publier le document";
      window.alert(
        (isEditing ? "Mise à jour impossible: " : "Publication impossible: ") +
          (error.message || "erreur inconnue"),
      );
    }
  });

  elements.cancelDocumentEdit.addEventListener("click", () => {
    resetDocumentForm();
  });

  elements.announcementForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const isEditing = Boolean(editingAnnouncementId);
    const submitButton = elements.announcementSubmitButton;
    submitButton.disabled = true;
    submitButton.textContent = isEditing
      ? "Mise à jour en cours..."
      : "Publication en cours...";

    const payload = {
      title: document.getElementById("announcement-title").value.trim(),
      message: document.getElementById("announcement-message").value.trim(),
      date: document.getElementById("announcement-date").value,
    };

    try {
      if (isEditing) {
        await store.updateAnnouncement(editingAnnouncementId, payload);
      } else {
        await store.addAnnouncement(payload);
      }

      resetAnnouncementForm();
      submitButton.disabled = false;
      await refresh();
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = isEditing
        ? "Mettre à jour l'annonce"
        : "Publier l'annonce";
      window.alert(
        (isEditing ? "Mise à jour impossible: " : "Publication impossible: ") +
          (error.message || "erreur inconnue"),
      );
    }
  });

  elements.cancelAnnouncementEdit.addEventListener("click", () => {
    resetAnnouncementForm();
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
