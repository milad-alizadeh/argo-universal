@smoke @electron-only
Feature: Desktop Chart preview
  Scenario: The desktop captures a Chart draft without opening it in the Feed
    Given a wide Frame
    Then the Chart preview Operation returns a cropped dark web PNG

  Scenario: An unavailable Chart drawing never becomes a PNG
    Given a wide Frame
    Then the Chart preview Operation explains when the drawing cannot load
