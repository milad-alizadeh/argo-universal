@smoke @electron-only
Feature: Desktop Registry images
  Scenario: The desktop can display logos from the official Registry CDN
    Given a wide Frame
    Then an official Registry logo loads in the desktop renderer
