
> **Source**: [https://docs.github.com/en/actions/how-tos/reuse-automations/create-workflow-templates](https://docs.github.com/en/actions/how-tos/reuse-automations/create-workflow-templates)

{% data reusables.actions.enterprise-github-hosted-runners %}

## Creating workflow templates

This procedure demonstrates how to create a workflow template and metadata file. The metadata file describes how the workflow templates will be presented to users when they are creating a new workflow.

1. If it doesn't already exist, create a new repository named `.github` in your organization.
1. Create a directory named `workflow-templates`.
1. Create your new workflow file inside the `workflow-templates` directory.

   If you need to refer to a repository's default branch, you can use the `$default-branch` placeholder. When a workflow is created the placeholder will be automatically replaced with the name of the repository's default branch.

   {% ifversion ghes %}

   > [!NOTE]
   > The following values in the `runs-on` key are also treated as placeholders:
   >
   > * `ubuntu-latest` is replaced with `[ self-hosted ]`
   > * `windows-latest` is replaced with `[ self-hosted, windows ]`
   > * `macos-latest` is replaced with `[ self-hosted, macOS ]`
   {% endif %}

   For example, this file named `octo-organization-ci.yml` demonstrates a basic workflow.

   ```yaml copy
   name: Octo Organization CI

   on:
     push:
       branches: [ $default-branch ]
     pull_request:
       branches: [ $default-branch ]

   jobs:
     build:
       runs-on: ubuntu-latest

       steps:
         - uses: {% data reusables.actions.action-checkout %}

         - name: Run a one-line script
           run: echo Hello from Octo Organization
   ```

1. Create a metadata file inside the `workflow-templates` directory. The metadata file must have the same name as the workflow file, but instead of the `.yml` extension, it must be appended with `.properties.json`. For example, this file named `octo-organization-ci.properties.json` contains the metadata for a workflow file named `octo-organization-ci.yml`:

   {% data reusables.actions.workflow-templates-metadata-example %}

   {% data reusables.actions.workflow-templates-metadata-keys %}

1. To add another workflow template, add your files to the same `workflow-templates` directory.

## Next steps

* For reference information about workflow templates, see [AUTOTITLE](/actions/reference/workflows-and-actions/reusing-workflow-configurations#workflow-templates).
