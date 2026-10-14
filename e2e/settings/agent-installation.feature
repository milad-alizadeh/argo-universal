Feature: Registry Agent installation
  Scenario Outline: Install a selected release without claiming sign-in readiness
    Given a <layout> Frame
    And the external Agent installer is held
    When I confirm installing Example Agent
    Then the Install button shows the installation in progress
    When the external Agent installer completes
    Then Example Agent installation completes with readiness checked separately
    And Example Agent is Ready on its page and in the Agents list

    Examples:
      | layout |
      | wide   |
      | phone  |

  Scenario Outline: Show an actionable external installation failure
    Given a <layout> Frame
    And the external Agent installer reports <failure>
    When I confirm installing Example Agent
    Then the installation explains <failure> and offers another attempt

    Examples:
      | layout | failure         |
      | wide   | missing-runtime |
      | phone  | missing-runtime |
      | wide   | failure         |
      | phone  | failure         |

  Scenario Outline: Cancelling the confirmation starts no installation
    Given a <layout> Frame
    And the external Agent installer is held
    When I cancel installing Example Agent
    Then no installation is started

    Examples:
      | layout |
      | wide   |
      | phone  |

  @web-only
  Scenario Outline: Another App retry replaces the first App's failed installation
    Given a <layout> Frame
    And the external Agent installer reports failure
    When I confirm installing Example Agent
    Then the installation explains failure and offers another attempt
    When another App retries and both Apps show the installed release

    Examples:
      | layout |
      | wide   |
      | phone  |

  @web-only
  Scenario Outline: Recover an accepted installation after losing its response
    Given a <layout> Frame
    And the external Agent installer is held
    And the App loses the accepted installation response
    When I confirm installing Example Agent
    Then the Install button shows the installation in progress
    And the App recovered the dropped installation response
    When the external Agent installer completes
    Then Example Agent installation completes with readiness checked separately

    Examples:
      | layout |
      | wide   |
      | phone  |
