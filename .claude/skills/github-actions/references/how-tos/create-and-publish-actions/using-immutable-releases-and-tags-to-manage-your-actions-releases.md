
> **Source**: [https://docs.github.com/en/actions/how-tos/create-and-publish-actions/using-immutable-releases-and-tags-to-manage-your-actions-releases](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/using-immutable-releases-and-tags-to-manage-your-actions-releases)

If you enable immutable releases on your action's repository, you can manage your action's releases as follows:

1. To start the release cycle, develop and validate a potential release for your action on a release branch.
1. Determine how you want to share your changes:
   * If you are ready to share an unchangeable version of your action, create a release on {% data variables.product.github %} with a release-specific tag (for example, `v1.0.0`). See [AUTOTITLE](/repositories/releasing-projects-on-github/managing-releases-in-a-repository#creating-a-release).
   * If you want to be able to update the Git tag of a release later, do not create a release on {% data variables.product.github %}. Instead, create a tag as follows:
     * If your release contains breaking changes for existing workflows, create a major version tag (for example, `v1`).
     * If your release contains new backwards-compatible functionality, create a minor version tag (for example, `v1.1`).
     * If your release contains backwards-compatible bug fixes, create a patch version tag (for example, `v1.1.1`).
1. For Git tags that are not tied to a release on {% data variables.product.github %}, ensure users have access to the latest compatible version of your action by updating them as follows:
   * For a major version, update the tag to point to the Git ref of the latest related minor version or patch version.
   * For a minor version, update the tag to point to the Git ref of the latest related patch version.

    To move an existing Git tag to the most recent commit, force push the tag with the following commands:

    ```bash copy
    git tag -f TAG-NAME
    git push -f --tags
    ```
