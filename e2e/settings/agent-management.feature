Feature: Saved Registry Agents
  Scenario Outline: Install and Remove save the choice immediately
    Given a <layout> Frame
    When I browse available Agents
    And I install Example Agent from its card
    Then Example Agent moves into the installed group and picker
    When I remove Example Agent from its card
    Then Example Agent is offered for Install without a confirmation

    Examples:
      | layout |
      | wide   |
      | phone  |
