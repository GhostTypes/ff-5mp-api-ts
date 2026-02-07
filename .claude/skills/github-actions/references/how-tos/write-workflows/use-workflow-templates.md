
> **Source**: [https://docs.github.com/en/actions/how-tos/write-workflows/use-workflow-templates](https://docs.github.com/en/actions/how-tos/write-workflows/use-workflow-templates)

{% data reusables.actions.enterprise-github-hosted-runners %}

## Choosing and using a workflow template

{% data reusables.repositories.navigate-to-repo %}
{% data reusables.repositories.actions-tab %}
{% data reusables.actions.new-starter-workflow %}
1. The "Choose a workflow" page shows a selection of recommended workflow templates. Find the workflow template that you want to use, then click **Configure**. To help you find the workflow template that you want, you can search for keywords or filter by category.
1. If the workflow template contains comments detailing additional setup steps, follow these steps.

   There are guides to accompany many of the workflow templates for building and testing projects. For more information, see [AUTOTITLE](/actions/automating-builds-and-tests).

1. Some workflow templates use secrets. For example, {% raw %}`${{ secrets.npm_token }}`{% endraw %}. If the workflow template uses a secret, store the value described in the secret name as a secret in your repository. For more information, see [AUTOTITLE](/actions/security-guides/using-secrets-in-github-actions).
1. Optionally, make additional changes. For example, you might want to change the value of `on` when the workflow runs.
1. Click **Start commit**.
1. Write a commit message and decide whether to commit directly to the default branch or to open a pull request.

## Further reading

* [AUTOTITLE](/actions/automating-builds-and-tests/about-continuous-integration)
* [AUTOTITLE](/actions/managing-workflow-runs)
* [AUTOTITLE](/actions/monitoring-and-troubleshooting-workflows/about-monitoring-and-troubleshooting)
{% ifversion fpt or ghec %}
* [AUTOTITLE](/billing/managing-billing-for-github-actions)
{% endif %}
