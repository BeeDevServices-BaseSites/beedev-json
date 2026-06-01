const REGISTRY_URL = "./index.json";
// const JSON_BASE_URL = "https://json.beedev-services.com";
const JSON_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? window.location.origin
    : "https://json.beedev-services.com";

const hubGrid = document.getElementById("hubGrid");
const registryStatus = document.getElementById("registryStatus");
const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");
const emptyState = document.getElementById("emptyState");
const filterButtons = document.querySelectorAll(".filter-btn");

function buildUrl(url) {
  if (!url) return null;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `${JSON_BASE_URL}${url}`;
}

let registry = [];
let currentFilter = "all";

function isActive(value) {
  return value !== false;
}

function formatDate(dateValue) {
  if (!dateValue) return "Not set";
  return dateValue;
}

function statusBadge(active) {
  return active
    ? `<span class="badge badge-active">Active</span>`
    : `<span class="badge badge-inactive">Inactive</span>`;
}

function typeBadge(type) {
  if (!type) return "";
  return `<span class="badge badge-type">${type}</span>`;
}

function dateMeta(label, value) {
  if (!value) return "";
  return `<span><strong>${label}:</strong> ${formatDate(value)}</span>`;
}

function fileMatchesFilter(file) {
  if (currentFilter === "active") return isActive(file.is_active);
  if (currentFilter === "inactive") return !isActive(file.is_active);
  return true;
}

function renderFile(file) {
  if (!fileMatchesFilter(file)) return "";

  const active = isActive(file.is_active);
  const primaryUrl = buildUrl(file.url);
  const altUrl = buildUrl(file.alt_url);

  return `
    <li class="file-item ${active ? "" : "inactive"}">
      <div class="file-topline">
        <div>
          <strong class="file-title">${file.label}</strong>
          <div class="file-badges">
            ${statusBadge(active)}
            ${typeBadge(file.type)}
          </div>
        </div>
      </div>

      ${
        file.description
          ? `<p class="file-description">${file.description}</p>`
          : ""
      }

      ${
        primaryUrl
          ? `<a class="file-link" href="${primaryUrl}" target="_blank" rel="noopener">
              Primary: ${primaryUrl}
            </a>`
          : ""
      }

      ${
        altUrl
          ? `<a class="alt-link" href="${altUrl}" target="_blank" rel="noopener">
              Current/Alt: ${altUrl}
            </a>`
          : ""
      }

      <div class="meta-line">
        ${dateMeta("Created", file.created_at)}
        ${dateMeta("Updated", file.last_updated)}
        ${dateMeta("Swapped", file.swapped_at)}
      </div>
    </li>
  `;
}

function renderFiles(files = []) {
  const renderedFiles = files.map(renderFile).filter(Boolean);

  if (!renderedFiles.length) {
    return "";
  }

  return `<ul class="file-list">${renderedFiles.join("")}</ul>`;
}

function renderClient(client) {
  if (!isActive(client.is_active)) return "";

  const filesHtml = renderFiles(client.files || []);

  if (!filesHtml && currentFilter !== "all") return "";

  return `
    <div class="client-block">
      <div class="block-heading">
        <div>
          <h4>${client.name}</h4>
          <div class="card-meta">
            <span class="badge badge-slug">${client.slug}</span>
            ${statusBadge(true)}
          </div>
        </div>
      </div>

      <div class="meta-line">
        ${dateMeta("Created", client.created_at)}
        ${dateMeta("Updated", client.last_updated)}
      </div>

      ${filesHtml || `<p class="muted">No files listed yet.</p>`}
    </div>
  `;
}

function renderGroup(group) {
  if (!isActive(group.is_active)) return "";

  const clientsHtml = (group.clients || [])
    .map(renderClient)
    .filter(Boolean)
    .join("");

  if (!clientsHtml && currentFilter !== "all") return "";

  return `
    <div class="group-block">
      <div class="block-heading">
        <div>
          <h3>${group.name}</h3>
          <div class="card-meta">
            <span class="badge badge-slug">${group.slug}</span>
            ${statusBadge(true)}
          </div>
        </div>
      </div>

      <div class="meta-line">
        ${dateMeta("Created", group.created_at)}
        ${dateMeta("Updated", group.last_updated)}
      </div>

      ${clientsHtml || `<p class="muted">No active clients listed yet.</p>`}
    </div>
  `;
}

function renderSection(section) {
  if (!isActive(section.is_active)) return "";

  const filesHtml = renderFiles(section.files || []);

  const groupsHtml = (section.groups || [])
    .map(renderGroup)
    .filter(Boolean)
    .join("");

  if (!filesHtml && !groupsHtml && currentFilter !== "all") return "";

  return `
    <article class="hub-card">
      <h2>${section.name}</h2>

      <div class="card-meta">
        <span class="badge badge-slug">${section.slug}</span>
        ${statusBadge(true)}
      </div>

      <div class="meta-line">
        ${dateMeta("Created", section.created_at)}
        ${dateMeta("Updated", section.last_updated)}
      </div>

      ${filesHtml}
      ${groupsHtml}

      ${
        !filesHtml && !groupsHtml
          ? `<p class="muted">No files or groups listed yet.</p>`
          : ""
      }
    </article>
  `;
}

function getSearchText(item) {
  return JSON.stringify(item).toLowerCase();
}

function sectionContainsMatchingFile(section) {
  const searchTerm = searchInput.value.trim().toLowerCase();

  if (!searchTerm) return true;

  return getSearchText(section).includes(searchTerm);
}

function render(data) {
  const activeSections = data
    .filter((section) => isActive(section.is_active))
    .filter(sectionContainsMatchingFile);

  const html = activeSections
    .map(renderSection)
    .filter(Boolean)
    .join("");

  hubGrid.innerHTML = html;

  if (!html) {
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.add("hidden");
  }
}

function updateFilterButtons() {
  filterButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.filter === currentFilter
    );
  });
}

async function loadRegistry() {
  registryStatus.textContent = "Loading index.json...";

  try {
    const response = await fetch(`${REGISTRY_URL}?v=${Date.now()}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log("registry data", data)

    registry = data.sections || [];

    render(registry);

    const activeSectionCount = registry.filter((section) =>
      isActive(section.is_active)
    ).length;

    registryStatus.textContent = `${data.name || "Registry"} loaded. ${activeSectionCount} active section(s). Last updated: ${
      data.last_updated || "Not set"
    }.`;
  } catch (error) {
    console.error("JSON Hub load error:", error);

    registryStatus.textContent =
      "Could not load index.json. Check that the file exists and contains valid JSON.";

    hubGrid.innerHTML = "";
    emptyState.classList.remove("hidden");
  }
}

searchInput.addEventListener("input", () => {
  render(registry);
});

refreshBtn.addEventListener("click", loadRegistry);

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    updateFilterButtons();
    render(registry);
  });
});

updateFilterButtons();
loadRegistry();