Feature: Sign-in in Plugin Settings
  Scenario Outline: Find sign-in without a running Plugin
    Given an Account Plugin is <state>
    And a <layout> Frame
    When I open the Account Plugin settings
    Then the Account Plugin row says "<label>" without starting its worker
    When I follow the Account Plugin row
    Then the Account Plugin destination is "<destination>"

    Examples:
      | state       | layout | label                | destination |
      | signed-out  | wide   | Sign in              | sign-in     |
      | signed-in   | wide   | Signed in as Fixture | account     |
      | stopped     | phone  | Sign in              | sign-in     |
      | crashed     | wide   | Sign in              | unavailable |

  Scenario: Open the calling Plugin's settings from its sign-in page
    Given an Account Plugin is signed-out
    And a wide Frame
    When I open the Account Plugin settings
    And I follow the Account Plugin row
    And I press the Account Plugin's settings Action
    Then the Account Plugin settings are open
