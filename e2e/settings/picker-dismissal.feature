Feature: Pickers in the Settings modal
  @smoke
  Scenario: Choosing a value on a Settings page keeps Settings open
    Given a wide Frame
    When I open Settings
    And I open "Conversation" from the Settings list
    And I open the "End a silent Conversation after" Settings picker
    And I choose "10 minutes" from the Settings picker
    Then "End a silent Conversation after" shows "10 minutes" in the Settings modal

  @smoke
  Scenario: Choosing Appearance keeps Settings open
    Given a wide Frame
    When I open Settings
    And I open the "Appearance" Settings picker
    And I choose "Dark" from the Appearance menu
    Then "Appearance" shows "Dark" in the Settings modal

  @smoke
  Scenario: Escape closes the picker before the Settings modal
    Given a wide Frame
    When I open Settings
    And I open "Conversation" from the Settings list
    And I open the "End a silent Conversation after" Settings picker
    And I press Escape in the Settings picker
    Then "End a silent Conversation after" shows "5 minutes" in the Settings modal
    When I dismiss the Settings modal with Escape
    Then focus returns to the Settings rail tile

  @smoke
  Scenario: Choosing where a Project starts Sessions keeps Settings open
    Given a wide Frame
    When I open Settings
    And I open the Projects
    And I open the Server's Project
    And I open the "Start in" Settings picker
    And I choose "New worktree" from the Settings picker
    Then "Start in" shows "New worktree" in the Settings modal

  @smoke
  Scenario: Choosing a Follow-up suggestions model keeps Settings open
    Given a 1728 by 1117 Frame
    When I open Settings
    And I open "Composer" from the Settings list
    And I open the "Claude" Settings picker
    And I choose "Same as Session" from the Settings picker
    Then "Claude" shows "Same as Session" in the Settings modal

  @smoke
  Scenario: A press that ends inside Settings leaves it open
    Given a 1728 by 1117 Frame
    When I open Settings
    And I open "Composer" from the Settings list
    And I drag from the dim to the "Claude" Settings picker
    Then "Claude" shows "haiku" in the Settings modal
    When I open the "Claude" Settings picker
    And I choose "Same as Session" from the Settings picker
    Then "Claude" shows "Same as Session" in the Settings modal
