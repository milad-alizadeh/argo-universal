@web-only
Feature: Protocol sign-in belongs to its initiating App window
  Scenario: A copied App window cannot take over an active sign-in
    Given a wide Frame
    And a saved protocol sign-in Agent "Owned Login ACP"
    When I open protocol sign-in for "Owned Login ACP"
    And I choose the Agent's subscription sign-in method
    Then the App shows the Agent's device code instructions
    When a copied App window tries sign-in for "Owned Login ACP"
    Then the App shows the Agent's device code instructions
    When I finish the Agent's browser sign-in
    Then the App reports the Agent is ready to use

  Scenario: The initiating App can return to sign-in after reloading
    Given a wide Frame
    And a saved protocol sign-in Agent "Reload Login ACP"
    When I open protocol sign-in for "Reload Login ACP"
    And I choose the Agent's subscription sign-in method
    Then the App shows the Agent's device code instructions
    When I reopen the App and return to protocol sign-in for "Reload Login ACP"
    Then the App shows the Agent's device code instructions
    When I finish the Agent's browser sign-in
    Then the App reports the Agent is ready to use

  Scenario: Reloading a copied window after the initiating App closes cannot transfer sign-in
    Given a wide Frame
    And a saved protocol sign-in Agent "Closed Login ACP"
    When I open protocol sign-in for "Closed Login ACP"
    And I choose the Agent's subscription sign-in method
    Then the App shows the Agent's device code instructions
    When a copied App window tries sign-in after the initiating App closes for "Closed Login ACP"
