@web-only
Feature: Drawer keyboard focus
  Scenario: A closed Drawer leaves nothing hidden in the Tab order
    Given a phone Frame
    Then the Tab order holds nothing hidden from assistive technology

  Scenario: Choosing a Drawer row by keyboard lands focus on the new page
    Given a phone Frame
    When I open the Drawer and choose Settings with the keyboard
    Then focus is on the Open navigation button of the Settings page
