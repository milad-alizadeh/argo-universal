@github-pulls
Feature: A Session's pull requests from the real GitHub Plugin appear in the Workbench
  The real GitHub Plugin reads a fixture GitHub: four Open pull requests are attached to a Session, and the Workbench
  draws them (ADR-0052). Story tests cover Show more, Show less and opening a row on GitHub.

  Scenario: Four Open pull requests attached to a Session appear as rows
    Given a wide Frame
    And a Session named "Review four pull requests"
    And the Session has the four fixture pull requests attached
    Then the Workbench shows 3 pull request rows
