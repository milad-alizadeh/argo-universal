Feature: Pickers in the Settings modal
  @smoke
  Scenario Outline: Choosing <picker> keeps Settings open
    Given a 1728 by 1117 Frame
    When I open Settings
    And I open "<page>" from the Settings list
    And I open the "<picker>" Settings picker
    And I choose "<choice>" from the Settings picker
    Then "<picker>" shows "<choice>" in the Settings modal

    Examples:
      | page         | picker                          | choice          |
      | Conversation | End a silent Conversation after | 10 minutes      |
      | Composer     | Claude                          | Same as Session |

  @smoke
  Scenario: Choosing Appearance keeps Settings open
    Given a wide Frame
    When I open Settings
    And I open the "Appearance" Settings picker
    And I choose "Dark" from the Appearance menu
    Then "Appearance" shows "Dark" in the Settings modal

  @smoke
  Scenario Outline: Escape closes the <popup> before the Settings modal
    Given a wide Frame
    When I open Settings
    And I open "<page>" from the Settings list
    And I open the "<picker>" Settings picker
    And I press Escape in the Settings <popup>
    Then the Settings modal remains open
    When I dismiss the Settings modal with Escape
    Then focus returns to the Settings rail tile

    Examples:
      | page         | picker                          | popup   |
      | Conversation | End a silent Conversation after | listbox |
      | Composer     | Appearance                      | menu    |

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
  Scenario: A press that ends inside Settings leaves it open
    Given a 1728 by 1117 Frame
    When I open Settings
    And I open "Composer" from the Settings list
    And I drag from the dim to the "Claude" Settings picker
    And I open the "Claude" Settings picker
    Then the Settings picker offers "Same as Session"
