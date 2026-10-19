@smoke @electron-only
Feature: Desktop browser links
  Scenario: Web links leave the App window intact
    Given a wide Frame
    When I open a website link from the desktop renderer
    Then the system browser receives the website and the App stays open
