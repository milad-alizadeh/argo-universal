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
