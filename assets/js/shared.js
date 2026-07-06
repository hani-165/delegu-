(function () {
  const CHANNEL_NAME = "portail-des-cours-changes";
  const DOCUMENTS_TABLE = "documents";
  const ANNOUNCEMENTS_TABLE = "announcements";
  const STORAGE_BUCKET = "documents";

  function getClient() {
    if (!window.supabaseClient) {
      throw new Error(
        "Supabase n'est pas configuré. Vérifiez assets/js/config.js.",
      );
    }

    return window.supabaseClient;
  }

  function isConfigured() {
    return Boolean(window.supabaseClient);
  }

  function formatDate(value) {
    if (!value) {
      return "Date inconnue";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  function formatFileSize(size) {
    if (!size && size !== 0) {
      return "Taille inconnue";
    }

    const units = ["o", "Ko", "Mo", "Go"];
    let value = size;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }

    return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  function getExtension(filename) {
    if (!filename || !filename.includes(".")) {
      return "Fichier";
    }

    return filename.split(".").pop().toUpperCase();
  }

  async function getDocuments() {
    const client = getClient();
    const { data, error } = await client
      .from(DOCUMENTS_TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  function getPublicFileUrl(filePath) {
    const client = getClient();
    const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function addDocument(payload) {
    const client = getClient();
    const file = payload.file;
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${Date.now()}-${safeName}`;

    const { error: uploadError } = await client.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      throw uploadError;
    }

    const { error: insertError } = await client.from(DOCUMENTS_TABLE).insert({
      title: payload.title,
      subject: payload.subject,
      teacher: payload.teacher,
      category: payload.category,
      description: payload.description || "",
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type || "application/octet-stream",
    });

    if (insertError) {
      await client.storage.from(STORAGE_BUCKET).remove([path]);
      throw insertError;
    }
  }

  async function updateDocument(id, payload) {
    const client = getClient();
    const updateFields = {
      title: payload.title,
      subject: payload.subject,
      teacher: payload.teacher,
      category: payload.category,
      description: payload.description || "",
    };

    if (payload.file) {
      const file = payload.file;
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${Date.now()}-${safeName}`;

      const { error: uploadError } = await client.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        throw uploadError;
      }

      updateFields.file_path = path;
      updateFields.file_name = file.name;
      updateFields.file_size = file.size;
      updateFields.file_type = file.type || "application/octet-stream";
    }

    const { error } = await client
      .from(DOCUMENTS_TABLE)
      .update(updateFields)
      .eq("id", id);

    if (error) {
      if (payload.file) {
        await client.storage
          .from(STORAGE_BUCKET)
          .remove([updateFields.file_path]);
      }
      throw error;
    }

    if (payload.file && payload.previousFilePath) {
      await client.storage
        .from(STORAGE_BUCKET)
        .remove([payload.previousFilePath]);
    }
  }

  async function deleteDocument(id, filePath) {
    const client = getClient();
    const { error } = await client.from(DOCUMENTS_TABLE).delete().eq("id", id);

    if (error) {
      throw error;
    }

    if (filePath) {
      await client.storage.from(STORAGE_BUCKET).remove([filePath]);
    }
  }

  function downloadDocument(record) {
    const url = getPublicFileUrl(record.file_path);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = record.file_name || record.title || "document";
    link.target = "_blank";
    link.rel = "noopener";
    window.document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function getAnnouncements() {
    const client = getClient();
    const { data, error } = await client
      .from(ANNOUNCEMENTS_TABLE)
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async function addAnnouncement(payload) {
    const client = getClient();
    const { error } = await client.from(ANNOUNCEMENTS_TABLE).insert({
      title: payload.title,
      message: payload.message,
      date: payload.date,
    });

    if (error) {
      throw error;
    }
  }

  async function updateAnnouncement(id, payload) {
    const client = getClient();
    const { error } = await client
      .from(ANNOUNCEMENTS_TABLE)
      .update({
        title: payload.title,
        message: payload.message,
        date: payload.date,
      })
      .eq("id", id);

    if (error) {
      throw error;
    }
  }

  async function deleteAnnouncement(id) {
    const client = getClient();
    const { error } = await client
      .from(ANNOUNCEMENTS_TABLE)
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }
  }

  function subscribeToChanges(callback) {
    if (!isConfigured()) {
      return () => {};
    }

    const client = getClient();
    const channel = client
      .channel(CHANNEL_NAME)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: DOCUMENTS_TABLE },
        callback,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: ANNOUNCEMENTS_TABLE },
        callback,
      )
      .subscribe();

    return () => client.removeChannel(channel);
  }

  async function getSession() {
    const client = getClient();
    const { data } = await client.auth.getSession();
    return data.session;
  }

  async function signIn(email, password) {
    const client = getClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data.session;
  }

  async function signOut() {
    const client = getClient();
    await client.auth.signOut();
  }

  async function updatePassword(newPassword) {
    const client = getClient();
    const { error } = await client.auth.updateUser({ password: newPassword });

    if (error) {
      throw error;
    }
  }

  function onAuthStateChange(callback) {
    const client = getClient();
    const { data } = client.auth.onAuthStateChange((_event, session) =>
      callback(session),
    );
    return () => data.subscription.unsubscribe();
  }

  window.PortailStore = {
    isConfigured,
    formatDate,
    formatFileSize,
    getExtension,
    getDocuments,
    addDocument,
    updateDocument,
    deleteDocument,
    downloadDocument,
    getPublicFileUrl,
    getAnnouncements,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    subscribeToChanges,
    getSession,
    signIn,
    signOut,
    updatePassword,
    onAuthStateChange,
  };
})();
