@without-projects
Feature: Add a Project from the App
  Scenario: Add the Server's folder as a Project from Get started
    Given a wide Frame
    And the fixture Server has no Projects
    When I add the fixture folder as a Project from Get started
    Then Get started no longer asks for a Project
