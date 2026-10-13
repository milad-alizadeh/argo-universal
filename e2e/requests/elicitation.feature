@web-only
Feature: Session Elicitation
  Scenario Outline: Answer an Elicitation over the retained Composer
    Given a wide Frame
    And Agent <agent> asks for an Elicitation
    And a New Session with Agent <agent>
    When I send the prompt "Ask for issue details"
    Then the Elicitation "A few details for the new issue" opens over the Composer
    When I submit the Elicitation title "Drafts vanish after a reconnect"
    Then the Agent replies "The shared fixture completed this Turn."
    And the Elicitation closes and the Composer accepts "Follow-up draft"

    Examples:
      | agent |
      | 1     |
      | 2     |
