
const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#name');
const statusInput = document.querySelector('#status');
const projectList = document.querySelector('#project-list');
const emptyState = document.querySelector('#empty-state');
const saveButton = document.querySelector('#save-button');
const cancelButton = document.querySelector('#cancel-button');
const formTitle = document.querySelector('#form-title');
const message = document.querySelector('#message');

let projects = [];
let editingId = null;
let loading = false;
let saving = false;
let loadFailed = false;

function setBusy(busy) {
  saving = busy;
  saveButton.disabled = busy || loading;
  cancelButton.disabled = busy || loading;

  projectList.querySelectorAll('button').forEach(button => {
    button.disabled = busy || loading;
  });
}

function showMessage(text) {
  message.textContent = text;
}

async function readError(response) {
  try {
    const data = await response.json();
    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error;
    }
  } catch {
    // The response might not contain JSON.
  }

  return `Request failed (${response.status} ${response.statusText}).`;
}

async function requestJson(url, options = {}) {
  let response;

  try {
    response = await fetch(url, options);
  } catch {
    throw new Error(
      'Cannot connect to the server. Check that the server is running and try again.'
    );
  }

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  if (response.status === 204) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    throw new Error('The server returned an invalid response.');
  }
}

function resetForm() {
  editingId = null;
  form.reset();
  saveButton.textContent = 'Save Project';
  cancelButton.hidden = true;
  formTitle.textContent = 'Add a Project';
  nameInput.setCustomValidity('');
}

function renderProjects() {
  projectList.replaceChildren();

  projects.forEach(project => {
    const listItem = document.createElement('li');

    const projectName = document.createElement('strong');
    projectName.textContent = project.name;

    const projectStatus = document.createElement('span');
    projectStatus.textContent = ` — ${project.status}`;

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.textContent = 'Edit';
    editButton.disabled = loading || saving;

    editButton.addEventListener('click', () => {
      if (loading || saving) return;

      editingId = project.id;
      nameInput.value = project.name;
      statusInput.value = project.status;
      saveButton.textContent = 'Save changes';
      cancelButton.hidden = false;
      formTitle.textContent = 'Edit Project';
      nameInput.setCustomValidity('');
      showMessage(`Editing "${project.name}".`);
      nameInput.focus();
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    deleteButton.disabled = loading || saving;

    deleteButton.addEventListener('click', async () => {
      if (loading || saving) return;

      const confirmed = window.confirm(
        `Are you sure you want to delete "${project.name}"?`
      );

      if (!confirmed) {
        showMessage('Deletion cancelled. No changes were made.');
        return;
      }

      saving = true;
      setBusy(true);
      showMessage('Deleting project...');

      try {
        await requestJson(
          `/api/projects/${encodeURIComponent(project.id)}`,
          { method: 'DELETE' }
        );

        if (String(editingId) === String(project.id)) {
          resetForm();
        }

        await loadProjects(
          `"${project.name}" was deleted successfully.`
        );
      } catch (error) {
        showMessage(`Delete failed: ${error.message}`);
      } finally {
        saving = false;
        setBusy(false);
        renderProjects();
      }
    });

    listItem.appendChild(projectName);
    listItem.appendChild(projectStatus);
    listItem.appendChild(editButton);
    listItem.appendChild(deleteButton);
    projectList.appendChild(listItem);
  });

  if (emptyState) {
    emptyState.hidden = projects.length > 0 || loading || loadFailed;

    if (projects.length === 0 && !loading && !loadFailed) {
      emptyState.textContent = 'No projects added yet.';
    }
  }

  saveButton.disabled = loading || saving;
  cancelButton.disabled = loading || saving;
}

async function loadProjects(successMessage) {
  loading = true;
  loadFailed = false;
  renderProjects();
  showMessage('Loading projects...');

  try {
    const data = await requestJson('/api/projects');

    if (!Array.isArray(data)) {
      throw new Error('The server returned an invalid project list.');
    }

    const ids = new Set();

    for (const project of data) {
      if (
        !project ||
        (typeof project.id !== 'string' &&
          typeof project.id !== 'number') ||
        String(project.id).trim() === '' ||
        typeof project.name !== 'string' ||
        typeof project.status !== 'string'
      ) {
        throw new Error('The server returned an invalid project record.');
      }

      const idKey = String(project.id);

      if (ids.has(idKey)) {
        throw new Error('The server returned duplicate project IDs.');
      }

      ids.add(idKey);
    }

    projects = data;

    // If the record being edited no longer exists, leave Edit mode.
    if (
      editingId !== null &&
      !projects.some(
        project => String(project.id) === String(editingId)
      )
    ) {
      resetForm();
    }

    loadFailed = false;
    renderProjects();
    showMessage(
      successMessage ||
      (projects.length === 0
        ? 'No projects added yet.'
        : 'Projects loaded successfully.')
    );
  } catch (error) {
    loadFailed = true;
    renderProjects();
    showMessage(`Could not load projects: ${error.message}`);
  } finally {
    loading = false;
    renderProjects();
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();

  if (loading || saving) return;

  const name = nameInput.value.trim();
  const status = statusInput.value;

  if (!name) {
    nameInput.setCustomValidity('Please enter a project name.');
    nameInput.reportValidity();
    return;
  }

  nameInput.setCustomValidity('');

  const isEditing = editingId !== null;
  const selectedId = editingId;

  if (
    isEditing &&
    !projects.some(
      project => String(project.id) === String(selectedId)
    )
  ) {
    showMessage('Project not found. Reload the project list and try again.');
    await loadProjects();
    return;
  }

  const payload = { name, status };

  saving = true;
  setBusy(true);
  showMessage(isEditing ? 'Saving changes...' : 'Saving project...');

  try {
    const url = isEditing
      ? `/api/projects/${encodeURIComponent(selectedId)}`
      : '/api/projects';

    const result = await requestJson(url, {
      method: isEditing ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Do not reset the form unless the mutation succeeded.
    resetForm();

    await loadProjects(
      isEditing
        ? 'Project updated successfully.'
        : 'Project added successfully.'
    );

    if (loadFailed) {
      showMessage(
        'The change was saved, but the project list could not be refreshed. ' +
        'Reload the list before making another change.'
      );
    } else if (
      result &&
      result.id !== undefined &&
      !projects.some(
        project => String(project.id) === String(result.id)
      )
    ) {
      showMessage(
        'The change was saved, but the returned project was not found in the refreshed list.'
      );
    }
  } catch (error) {
    showMessage(
      `${isEditing ? 'Update' : 'Create'} failed: ${error.message}`
    );
  } finally {
    saving = false;
    setBusy(false);
    renderProjects();
  }
});

cancelButton.addEventListener('click', () => {
  if (loading || saving) return;

  resetForm();
  showMessage('Edit cancelled. No changes were saved.');
  renderProjects();
  nameInput.focus();
});

loadProjects();
