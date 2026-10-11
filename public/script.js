const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#name');
const statusInput = document.querySelector('#status');
const projectList = document.querySelector('#project-list');
const emptyState = document.querySelector('#empty-state');
const saveButton = document.querySelector('#save-button');
const cancelButton = document.querySelector('#cancel-button');
const formTitle = document.querySelector('#form-title');
const message = document.querySelector('#message');

const STORAGE_KEY = 'workshop-projects-v1';

// Projects are restored from localStorage at startup.
let projects = [];

// ID of the project currently being edited.
let editingId = null;

// Generate a unique ID for each project.
function generateProjectId() {
  return crypto.randomUUID();
}

// Save projects to localStorage.
function saveProjects() {
  try {
    // stringify converts the collection into text.
    const storedText = JSON.stringify(projects);
    localStorage.setItem(STORAGE_KEY, storedText);
    return true;
  } catch (error) {
    message.textContent =
      'Changes could not be saved to browser storage. ' +
      'Your changes may be lost if you refresh the page.';
    return false;
  }
}

// Load projects from localStorage.
function loadProjects() {
  let storedText;

  try {
    storedText = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    message.textContent =
      'Saved projects could not be read from browser storage.';
    return;
  }

  // No saved data means this is a new collection.
  if (storedText === null) {
    projects = [];
    return;
  }

  let storedProjects;

  try {
    // parse converts stored text back into JavaScript data.
    storedProjects = JSON.parse(storedText);
  } catch (error) {
    message.textContent =
      'Saved project data is invalid. ' +
      'The stored data has not been changed.';
    return;
  }

  // Validate the collection and each project record.
  const validStatuses = [
    'Planned',
    'In Progress',
    'Completed'
  ];

  const validRecords =
    Array.isArray(storedProjects) &&
    storedProjects.every(project =>
      project !== null &&
      typeof project === 'object' &&
      !Array.isArray(project) &&
      typeof project.id === 'string' &&
      project.id.trim() !== '' &&
      typeof project.name === 'string' &&
      project.name.trim() !== '' &&
      typeof project.status === 'string' &&
      validStatuses.includes(project.status)
    );

  const uniqueIds = validRecords &&
    new Set(storedProjects.map(project => project.id)).size ===
      storedProjects.length;

  if (!validRecords || !uniqueIds) {
    message.textContent =
      'Saved project data has an invalid format. ' +
      'The stored data has not been changed.';
    return;
  }

  projects = storedProjects;
}

// Reset the form and return to Add mode.
function resetForm() {
  editingId = null;
  form.reset();

  saveButton.textContent = 'Save Project';
  cancelButton.hidden = true;
  formTitle.textContent = 'Add a Project';

  nameInput.setCustomValidity('');
}

// Display projects with Edit and Delete buttons.
function renderProjects() {
  projectList.replaceChildren();

  projects.forEach(project => {
    const listItem = document.createElement('li');

    const projectName = document.createElement('strong');
    projectName.textContent = project.name;

    const projectStatus = document.createElement('span');
    projectStatus.textContent = ` — ${project.status} `;

    // Edit button.
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.textContent = 'Edit';

    editButton.addEventListener('click', () => {
      editingId = project.id;

      nameInput.value = project.name;
      statusInput.value = project.status;

      saveButton.textContent = 'Save changes';
      cancelButton.hidden = false;
      formTitle.textContent = 'Edit Project';

      message.textContent = `Editing "${project.name}".`;

      nameInput.setCustomValidity('');
      nameInput.focus();
    });

    // Delete button.
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';

    deleteButton.addEventListener('click', () => {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${project.name}"?`
      );

      // Cancelled deletion changes nothing.
      if (!confirmed) {
        message.textContent =
          'Deletion cancelled. No changes were made.';
        return;
      }

      // Exit Edit mode if deleting the project being edited.
      if (editingId === project.id) {
        resetForm();
      }

      // Find the selected record by its stable ID.
      const projectIndex = projects.findIndex(
        item => item.id === project.id
      );

      if (projectIndex === -1) {
        message.textContent =
          'Project not found. No project was deleted.';
        return;
      }

      // Remove the selected project.
      projects.splice(projectIndex, 1);

      // Persist the confirmed deletion.
      const saved = saveProjects();

      if (saved) {
        message.textContent = `"${project.name}" was deleted.`;
      }

      renderProjects();
    });

    listItem.appendChild(projectName);
    listItem.appendChild(projectStatus);
    listItem.appendChild(editButton);
    listItem.appendChild(deleteButton);

    projectList.appendChild(listItem);
  });

  // Update the empty-state message.
  if (emptyState) {
    emptyState.hidden = projects.length > 0;

    if (projects.length === 0) {
      emptyState.textContent = 'No projects added yet.';
    }
  }
}

// Handle both Add and Edit submissions.
form.addEventListener('submit', event => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const status = statusInput.value;

  // Validate the project name.
  if (!name) {
    nameInput.setCustomValidity(
      'Please enter a project name.'
    );
    nameInput.reportValidity();

    nameInput.addEventListener(
      'input',
      () => nameInput.setCustomValidity(''),
      { once: true }
    );

    return;
  }

  nameInput.setCustomValidity('');

  if (editingId !== null) {
    // Find and update the existing project.
    const project = projects.find(
      item => item.id === editingId
    );

    if (!project) {
      message.textContent =
        'Project not found. Please try again.';

      resetForm();
      renderProjects();
      return;
    }

    project.name = name;
    project.status = status;

    // Save the edited collection.
    const saved = saveProjects();

    if (saved) {
      message.textContent = 'Project updated successfully.';
    }
  } else {
    // Add a new project.
    projects.push({
      id: generateProjectId(),
      name: name,
      status: status
    });

    // Save the updated collection.
    const saved = saveProjects();

    if (saved) {
      message.textContent = 'Project added successfully.';
    }
  }

  resetForm();
  renderProjects();
  nameInput.focus();
});

// Cancel editing without changing saved records.
cancelButton.addEventListener('click', () => {
  resetForm();

  message.textContent =
    'Edit cancelled. No changes were saved.';

  renderProjects();
  nameInput.focus();
});

// Restore saved data before rendering the project list.
loadProjects();
renderProjects();