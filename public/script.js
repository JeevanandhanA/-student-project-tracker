
const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#name');
const statusInput = document.querySelector('#status');
const projectList = document.querySelector('#project-list');
const emptyState = document.querySelector('#empty-state');

// Temporary in-memory storage.
const projects = [];

// Generate a unique ID for each project.
function generateProjectId() {
  return crypto.randomUUID();
}

// Display all projects from the array.
function renderProjects() {
  projectList.replaceChildren();

  projects.forEach(project => {
    const listItem = document.createElement('li');

    const projectName = document.createElement('strong');
    projectName.textContent = project.name;

    const projectStatus = document.createElement('span');
    projectStatus.textContent = ` — ${project.status}`;

    listItem.appendChild(projectName);
    listItem.appendChild(projectStatus);

    projectList.appendChild(listItem);
  });

  // Update the empty-state message if the element exists.
  if (emptyState) {
    emptyState.hidden = projects.length > 0;

    if (projects.length === 0) {
      emptyState.textContent = 'No projects added yet.';
    }
  }
}

// Handle form submission.
form.addEventListener('submit', event => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const status = statusInput.value;

  // Reject an empty project name.
  if (!name) {
    nameInput.setCustomValidity('Please enter a project name.');
    nameInput.reportValidity();
    nameInput.addEventListener(
      'input',
      () => nameInput.setCustomValidity(''),
      { once: true }
    );
    return;
  }

  // Create a project using the values entered in the form.
  const project = {
    id: generateProjectId(),
    name: name,
    status: status
  };

  // Add the project to our array.
  projects.push(project);

  // Refresh the displayed list.
  renderProjects();

  // Clear the form for the next project.
  form.reset();
  nameInput.focus();
});

// Show the initial empty state.
renderProjects();
