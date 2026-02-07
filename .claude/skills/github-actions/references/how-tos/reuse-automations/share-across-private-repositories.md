
> **Source**: [https://docs.github.com/en/actions/how-tos/reuse-automations/share-across-private-repositories](https://docs.github.com/en/actions/how-tos/reuse-automations/share-across-private-repositories)

> [!WARNING]
> * {% data reusables.actions.outside-collaborators-actions %}
> * {% data reusables.actions.scoped-token-note %}

## Sharing actions and workflows from your private repository

1. Store the action or reusable workflow in a private repository. For more information, see [AUTOTITLE](/repositories/creating-and-managing-repositories/about-repositories#about-repository-visibility).
1. On {% data variables.product.prodname_dotcom %}, navigate to the main page of the private repository.
1. Under your repository name, click **{% octicon "gear" aria-hidden="true" aria-label="gear" %} Settings**.
{% data reusables.repositories.settings-sidebar-actions-general %}
1. To grant access to other private repositories, in the **Access** section at the bottom of the page, select **Accessible from repositories owned by 'USERNAME' user**.
1. Click **Save** to apply the settings.

## Next steps

To reuse your shared workflows, see [AUTOTITLE](/actions/using-workflows/reusing-workflows).
