@github-pulls
Feature: A pull request's row in the Workbench opens it on GitHub
  The real GitHub Plugin reads a fixture GitHub: four Open pull requests are attached to a Session, and the Workbench
  draws them (ADR-0052). The Inspector holds no pull requests; a row opens the pull request on GitHub.

  Scenario: Four Open pull requests, three shown, Show more for all, the fourth opens on GitHub, Show less for three
    Given a wide Frame
    And a Session named "Review four pull requests"
    And the Session has the four fixture pull requests attached
    Then the Workbench shows 3 pull request rows
    When I press "Show more" in the Workbench
    Then the Workbench shows 4 pull request rows
    When I press the fourth pull request's row
    Then GitHub's page for the fourth pull request is opened
    And the Inspector Changes tab is not open
    When I press "Show less" in the Workbench
    Then the Workbench shows 3 pull request rows
