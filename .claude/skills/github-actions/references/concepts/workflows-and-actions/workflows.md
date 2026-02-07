
> **Source**: [https://docs.github.com/en/actions/concepts/workflows-and-actions/workflows](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflows)

## About workflows

{% data reusables.actions.about-workflows-long %}

## Workflow basics

A workflow must contain the following basic components:

1. One or more _events_ that will trigger the workflow.
1. One or more _jobs_, each of which will execute on a _runner_ machine and run a series of one or more _steps_.
1. Each step can either run a script that you define or run an action, which is a reusable extension that can simplify your workflow.

For more information on these basic components, see [AUTOTITLE](/actions/learn-github-actions/understanding-github-actions#the-components-of-github-actions).

![Diagram of an event triggering Runner 1 to run Job 1, which triggers Runner 2 to run Job 2. Each of the jobs is broken into multiple steps.](/assets/images/help/actions/overview-actions-simple.png)

## Workflow triggers

{% data reusables.actions.about-triggers %}

For more information, see [AUTOTITLE](/actions/using-workflows/triggering-a-workflow).

## Next steps

To build your first workflow, see [AUTOTITLE](/actions/tutorials/creating-an-example-workflow).
