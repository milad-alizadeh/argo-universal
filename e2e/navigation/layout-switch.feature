Feature: Frame layout
  Scenario: The open Connection survives Frame changes
    Given a wide Frame
    When I view the Connection
    And the Frame becomes a phone Frame
    Then the Connection remains open in the phone Frame
    When the Frame becomes a wide Frame
    Then the Connection remains open in the wide Frame

  Scenario: A wide Settings list includes Accounts
    Given a wide Frame
    When I view the Connection
    And the Frame becomes a phone Frame
    When I return from the Connection
    Then the phone Frame shows the Settings list without Accounts detail
    When the Frame becomes a wide Frame
    Then the wide Frame shows Accounts beside the Settings list

  @web-only
  Scenario: Back from a Connection opened on its own returns to Settings
    Given the Connection was opened on its own in a phone Frame
    When I return from the Connection
    Then the phone Frame shows the Settings list

  Scenario: Back from a page opened before the Frame widened returns to its list
    Given a phone Frame
    When I view the Connection from the drawer
    And the Frame becomes a wide Frame
    Then the Connection remains open in the wide Frame
    When the Frame becomes a phone Frame
    And I return from the Connection
    Then the phone Frame shows the Settings list
