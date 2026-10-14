Feature: Agents already on this Mac
  Scenario Outline: An Agent installed outside Argo shows as installed
    Given a <layout> Frame
    And Path Agent is installed on this Mac outside Argo
    When I open the Agents page
    Then Path Agent is Ready and Found on this Mac without an install

    Examples:
      | layout |
      | wide   |
      | phone  |
