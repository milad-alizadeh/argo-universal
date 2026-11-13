@github-pulls
Feature: A pull request's own Checks and files in the Inspector
  The real GitHub Plugin reads a fixture GitHub: four Open pull requests are attached to a Session, and the Workbench
  and Inspector draw them (ADR-0052). The Session's Checkout is never what a pull request's files come from.

  Scenario: Four Open pull requests, from the Workbench to the fourth one's Checks and files and back to the list
    Given a wide Frame
    And a Session named "Review four pull requests"
    And the Session has the four fixture pull requests attached
    Then the Workbench previews three Open Changes
    And the Workbench groups the fourth as "1 more open"
    When I open the list of Changes from the Workbench
    Then the Inspector lists all four pull requests
    When I select the fourth pull request
    Then the Inspector shows the fourth pull request with its own Checks "CI Checks 2/3"
    When I open its files
    Then the Inspector lists the files of the fourth pull request and no others
    And the diff of the fourth pull request's first file shows its lines
    When I go back to the list of Changes
    Then the Inspector lists all four pull requests
