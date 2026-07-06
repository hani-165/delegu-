document.addEventListener("DOMContentLoaded", async () => {
  const store = window.PortailStore;

  const state = {
    documents: [],
    announcements: [],
    search: "",
    subject: "Tous",
  };

  const elements = {
    docCount: document.getElementById("public-doc-count"),
    subjectCount: document.getElementById("public-subject-count"),
    announcementCount: document.getElementById("public-announcement-count"),
    search: document.getElementById("public-search"),
    filters: document.getElementById("public-filters"),
    documents: document.getElementById("public-documents"),
    empty: document.getElementById("public-empty-state"),
    announcements: document.getElementById("public-announcements"),
    announcementsEmpty: document.getElementById("public-announcements-empty"),
    lastUpdate: document.getElementById("public-last-update"),
  };

  function uniqueSubjects(documents) {
    return Array.from(
      new Set(documents.map((item) => item.subject).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));
  }

  function filteredDocuments() {
    const search = state.search.trim().toLowerCase();

    return state.documents.filter((item) => {
      const matchesSubject =
        state.subject === "Tous" || item.subject === state.subject;

      const matchesSearch =
        !search ||
        [
          item.title,
          item.subject,
          item.teacher,
          item.category,
          item.file_name,
          item.description,
        ].some((value) => (value || "").toLowerCase().includes(search));

      return matchesSubject && matchesSearch;
    });
  }

  function renderStats() {
    const subjects = uniqueSubjects(state.documents);
    elements.docCount.textContent = state.documents.length.toString();
    elements.subjectCount.textContent = subjects.length.toString();
    elements.announcementCount.textContent =
      state.announcements.length.toString();
  }

  function renderFilters() {
    const subjects = ["Tous", ...uniqueSubjects(state.documents)];

    elements.filters.innerHTML = subjects
      .map((subject) => {
        const activeClass = subject === state.subject ? "active" : "";
        return `<button class="filter-button ${activeClass}" type="button" data-subject="${subject}">${subject}</button>`;
      })
      .join("");

    elements.filters.querySelectorAll("[data-subject]").forEach((button) => {
      button.addEventListener("click", () => {
        state.subject = button.dataset.subject;
        renderFilters();
        renderDocuments();
      });
    });
  }

  function renderDocuments() {
    const documents = filteredDocuments();
    elements.documents.innerHTML = "";
    elements.empty.hidden = documents.length > 0;

    if (!documents.length) {
      elements.lastUpdate.textContent = "";
      return;
    }

    elements.lastUpdate.textContent = `Dernière publication: ${store.formatDate(documents[0].created_at)}`;

    documents.forEach((item) => {
      const article = document.createElement("article");
      article.className = "document-item";
      article.innerHTML = `
        <div class="document-top">
          <div class="document-main">
            <div class="document-actions">
              <span class="type-badge">${store.getExtension(item.file_name)}</span>
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
          <button class="button button-primary" type="button" data-download="${item.id}">Télécharger</button>
        </div>
      `;
      elements.documents.appendChild(article);
    });

    elements.documents.querySelectorAll("[data-download]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = documents.find(
          (doc) => doc.id === button.dataset.download,
        );
        if (item) {
          store.downloadDocument(item);
        }
      });
    });
  }

  function renderAnnouncements() {
    elements.announcements.innerHTML = "";
    elements.announcementsEmpty.hidden = state.announcements.length > 0;

    state.announcements.forEach((announcement) => {
      const article = document.createElement("article");
      article.className = "announcement-item";
      article.innerHTML = `
        <h3>${announcement.title}</h3>
        <p>${announcement.message}</p>
        <span class="announcement-date">${store.formatDate(announcement.date)}</span>
      `;
      elements.announcements.appendChild(article);
    });
  }

  async function refresh() {
    if (!store.isConfigured()) {
      elements.lastUpdate.textContent =
        "Supabase n'est pas encore configuré. Voir assets/js/config.js et README.md.";
      elements.empty.hidden = false;
      return;
    }

    try {
      state.documents = await store.getDocuments();
      state.announcements = await store.getAnnouncements();
    } catch (error) {
      console.error(error);
      elements.lastUpdate.textContent =
        "Impossible de charger les documents pour le moment.";
      return;
    }

    renderStats();
    renderFilters();
    renderDocuments();
    renderAnnouncements();
  }

  elements.search.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderDocuments();
  });

  await refresh();
  store.subscribeToChanges(refresh);
});
