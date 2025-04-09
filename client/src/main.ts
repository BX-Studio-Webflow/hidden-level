import { Opening } from "../../types/opening";

document.addEventListener("DOMContentLoaded", async () => {
  const BASE_URL = "https://hidden-level-nine.vercel.app";
  const loader = document.querySelector<HTMLElement>("[dev-target=loader]");
  const rolesWrapper = document.querySelector<HTMLElement>(
    "[dev-target=roles-wrapper]"
  );
  const rolesList = rolesWrapper?.querySelector<HTMLElement>(
    "[dev-target=roles-list]"
  );
  const categoryItemTemplate = rolesWrapper?.querySelector<HTMLElement>(
    "[dev-target=category-item-template]"
  );

  if (!rolesWrapper || !rolesList || !categoryItemTemplate || !loader) {
    return console.error(
      "Roles wrapper, roles list or loader or category item template not found"
    );
  }

  try {
    const openings = await getAllRoles();
    console.log({ openings });
    rolesUiInit({
      openings,
      rolesList,
      categoryItemTemplate,
      rolesWrapper,
      loader,
    });
  } catch (error) {
    console.error("Error fetching openings:", error);
  }

  function rolesUiInit({
    openings,
    rolesList,
    categoryItemTemplate,
    rolesWrapper,
    loader,
  }: {
    openings: Opening;
    rolesWrapper: HTMLElement;
    rolesList: HTMLElement;
    categoryItemTemplate: HTMLElement;
    loader: HTMLElement;
  }) {
    rolesList.innerHTML = "";
    Object.entries(openings)
      .sort(([categoryA], [categoryB]) => {
        if (categoryA === "Others") return 1; // Move "Others" to the end
        if (categoryB === "Others") return -1;
        return categoryA.localeCompare(categoryB); // Sort alphabetically
      })
      .forEach(([category, roles]) => {
        const categoryItem = categoryItemTemplate.cloneNode(
          true
        ) as HTMLElement;
        const categoryQuestion = categoryItem.querySelector<HTMLElement>(
          "[dev-target=category-question]"
        );
        const categoryName = categoryItem.querySelector<HTMLElement>(
          "[dev-target=category-name]"
        );
        const categoryRolesList = categoryItem.querySelector<HTMLElement>(
          "[dev-target=category-roles-list]"
        );
        const roleItemTemplate = categoryItem.querySelector<HTMLElement>(
          "[dev-target=role-item-template]"
        );

        if (
          !categoryName ||
          !categoryRolesList ||
          !roleItemTemplate ||
          !categoryQuestion
        ) {
          return console.error(
            "Category name, roles list or categoryQuestion or role item template not found"
          );
        }

        categoryName.textContent = category;
        categoryRolesList.innerHTML = "";
        roles
          .sort((a, b) => a.jobTitle.localeCompare(b.jobTitle))
          .forEach((role) => {
            const roleItem = roleItemTemplate.cloneNode(true) as HTMLElement;
            const roleTitle =
              roleItem.querySelector<HTMLElement>("[dev-target=title]");
            const roleType =
              roleItem.querySelector<HTMLElement>("[dev-target=type]");
            const roleLocation = roleItem.querySelector<HTMLElement>(
              "[dev-target=location]"
            );
            const roleLink =
              roleItem.querySelector<HTMLAnchorElement>("[dev-target=link]");

            if (!roleTitle || !roleType || !roleLocation || !roleLink) {
              return console.error(
                "Role title, type, location or link not found"
              );
            }
            roleTitle.textContent = role.jobTitle;
            if (role.workerTypeCode) {
              roleType.textContent = role.workerTypeCode;
            } else {
              // roleType.parentElement?.previousElementSibling?.remove();
              // roleType.parentElement?.remove();
              roleType.textContent = "";
            }
            roleLocation.textContent = `${role.cityName}, ${role.codeValue}`;
            roleLink.href = role.openingLink;

            categoryRolesList.appendChild(roleItem);
          });

        categoryQuestion.addEventListener("click", function () {
          if (
            categoryRolesList.style.height === "0px" ||
            categoryRolesList.style.height === ""
          ) {
            // Expand
            categoryRolesList.style.height =
              categoryRolesList.scrollHeight + "px";
          } else {
            // Collapse
            categoryRolesList.style.height = "0px";
          }
        });

        rolesList.appendChild(categoryItem);
      });
    toggleHideElement({ element: loader, toggle: "hide" });
    toggleHideElement({ element: rolesWrapper, toggle: "show" });
  }

  async function getAllRoles() {
    try {
      const response = await fetch(`${BASE_URL}/api/openings`);
      const openings: Opening = await response.json();
      return openings;
    } catch (error) {
      console.error("Error fetching openings:", error);
      throw error;
    }
  }
  function toggleHideElement({
    element,
    toggle,
  }: {
    element: HTMLElement;
    toggle: "show" | "hide";
  }) {
    if (toggle === "show") {
      element.setAttribute("dev-hide", "false");
    } else {
      element.setAttribute("dev-hide", "true");
    }
  }
});
