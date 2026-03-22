"""
Curated knowledge base of gold-standard and poor-quality user stories and test cases.
Used by the RAG engine to provide few-shot context to the LLM evaluator.
"""

USER_STORIES = [
    {
        "id": "us_001",
        "type": "user_story",
        "quality": "excellent",
        "text": "As a registered customer, I want to reset my password via email so that I can regain access to my account if I forget my credentials.",
        "explanation": "Excellent: Independent (no dependency chain), negotiable, directly valuable to users, estimable in 1-2 days, small enough for one sprint, testable with clear acceptance criteria.",
        "invest_scores": {"independent": 5, "negotiable": 5, "valuable": 5, "estimable": 5, "small": 5, "testable": 5}
    },
    {
        "id": "us_002",
        "type": "user_story",
        "quality": "excellent",
        "text": "As an admin, I want to be able to deactivate a user account so that I can prevent unauthorized access immediately.",
        "explanation": "Excellent: Clear actor and goal, valuable for security, single action, testable via API and UI.",
        "invest_scores": {"independent": 5, "negotiable": 4, "valuable": 5, "estimable": 5, "small": 5, "testable": 5}
    },
    {
        "id": "us_003",
        "type": "user_story",
        "quality": "good",
        "text": "As a shopper, I want to filter products by category and price range so that I can quickly find items within my budget.",
        "explanation": "Good: Valuable and testable but slightly less independent — depends on product listing existing. Estimable but requires UI work.",
        "invest_scores": {"independent": 3, "negotiable": 4, "valuable": 5, "estimable": 4, "small": 4, "testable": 5}
    },
    {
        "id": "us_004",
        "type": "user_story",
        "quality": "poor",
        "text": "As a user, I want the system to be fast.",
        "explanation": "Poor: Vague actor, no specific action, not testable (no measurable criteria), not estimable, not small (performance is cross-cutting).",
        "invest_scores": {"independent": 3, "negotiable": 2, "valuable": 2, "estimable": 1, "small": 1, "testable": 1}
    },
    {
        "id": "us_005",
        "type": "user_story",
        "quality": "poor",
        "text": "As a developer, I want to refactor the database layer so the code is cleaner.",
        "explanation": "Poor: No end-user value, technical task disguised as a story, not negotiable from user perspective, hard to test for business value.",
        "invest_scores": {"independent": 2, "negotiable": 2, "valuable": 1, "estimable": 3, "small": 3, "testable": 2}
    },
    {
        "id": "us_006",
        "type": "user_story",
        "quality": "excellent",
        "text": "As a mobile user, I want to scan a QR code to log in so that I can access the app without typing my password on a small screen.",
        "explanation": "Excellent: Specific user segment, clear value proposition, independent feature, testable end-to-end.",
        "invest_scores": {"independent": 5, "negotiable": 5, "valuable": 5, "estimable": 4, "small": 4, "testable": 5}
    },
    {
        "id": "us_007",
        "type": "user_story",
        "quality": "good",
        "text": "As a content editor, I want a rich text editor with formatting options so that I can publish well-formatted blog posts.",
        "explanation": "Good: Clear user, valuable, but scope could be tighter — 'formatting options' is vague. Partially negotiable.",
        "invest_scores": {"independent": 4, "negotiable": 3, "valuable": 5, "estimable": 3, "small": 3, "testable": 4}
    },
    {
        "id": "us_008",
        "type": "user_story",
        "quality": "poor",
        "text": "As a user, I want all the features to work properly and the UI to look good.",
        "explanation": "Very poor: Multiple concerns, unmeasurable, not a real user story — too broad and untestable.",
        "invest_scores": {"independent": 1, "negotiable": 1, "valuable": 2, "estimable": 1, "small": 1, "testable": 1}
    },
    {
        "id": "us_009",
        "type": "user_story",
        "quality": "excellent",
        "text": "As a customer, I want to receive an email confirmation after placing an order so that I have a record of my purchase.",
        "explanation": "Excellent: Clear trigger event, obvious value, single responsibility, testable with specific email content checks.",
        "invest_scores": {"independent": 5, "negotiable": 4, "valuable": 5, "estimable": 5, "small": 5, "testable": 5}
    },
    {
        "id": "us_010",
        "type": "user_story",
        "quality": "good",
        "text": "As a manager, I want to export team performance reports as PDF so that I can share them in meetings.",
        "explanation": "Good: Valuable and testable. Estimability depends on existing report infrastructure.",
        "invest_scores": {"independent": 3, "negotiable": 4, "valuable": 5, "estimable": 3, "small": 4, "testable": 5}
    },
]

TEST_CASES = [
    {
        "id": "tc_001",
        "type": "test_case",
        "quality": "excellent",
        "text": """Test Case: Valid Login
Precondition: User is registered with email test@example.com and password Test@123
Steps:
1. Navigate to login page
2. Enter email: test@example.com
3. Enter password: Test@123
4. Click Login button
Expected Result: User is redirected to dashboard. Session token is created. Welcome message shows user's name.
Postcondition: User session is active.""",
        "explanation": "Excellent: Clear preconditions, atomic steps, precise expected result with multiple verifiable assertions.",
        "quality_scores": {"clarity": 5, "traceability": 5, "accuracy": 5, "completeness": 5, "coverage": 4}
    },
    {
        "id": "tc_002",
        "type": "test_case",
        "quality": "excellent",
        "text": """Test Case: Invalid Login - Wrong Password
Precondition: User exists with email test@example.com
Steps:
1. Navigate to login page
2. Enter email: test@example.com
3. Enter wrong password: wrongpass
4. Click Login button
Expected Result: Error message 'Invalid email or password' is displayed. User remains on login page. No session is created.
Postcondition: No active session.""",
        "explanation": "Excellent: Negative test case, precise error message checked, session state verified.",
        "quality_scores": {"clarity": 5, "traceability": 5, "accuracy": 5, "completeness": 5, "coverage": 5}
    },
    {
        "id": "tc_003",
        "type": "test_case",
        "quality": "poor",
        "text": "Test the login screen and make sure it works. Check that error messages appear when needed.",
        "explanation": "Very poor: No steps, no expected results, vague preconditions, not repeatable or automatable.",
        "quality_scores": {"clarity": 1, "traceability": 2, "accuracy": 1, "completeness": 1, "coverage": 2}
    },
    {
        "id": "tc_004",
        "type": "test_case",
        "quality": "good",
        "text": """Test Case: Password Reset Email
Precondition: Registered user with email user@test.com
Steps:
1. Click 'Forgot Password' on login page
2. Enter email: user@test.com
3. Click Submit
Expected Result: Success message shown. Email received within 60 seconds with reset link that expires in 24 hours.""",
        "explanation": "Good: Clear steps and expected results. Could improve with postcondition and link validation step.",
        "quality_scores": {"clarity": 4, "traceability": 4, "accuracy": 5, "completeness": 3, "coverage": 4}
    },
    {
        "id": "tc_005",
        "type": "test_case",
        "quality": "excellent",
        "text": """Test Case: Add to Cart - Out of Stock Item
Precondition: Product 'Widget X' has stock quantity = 0
Steps:
1. Navigate to product page for 'Widget X'
2. Verify 'Add to Cart' button is disabled or shows 'Out of Stock'
3. Attempt to call POST /cart with productId=widgetX
Expected Result: UI shows 'Out of Stock' badge. API returns 409 with message 'Product out of stock'. Cart count unchanged.
Postcondition: Cart unchanged.""",
        "explanation": "Excellent: Validates both UI and API layers, boundary condition, clear postcondition.",
        "quality_scores": {"clarity": 5, "traceability": 5, "accuracy": 5, "completeness": 5, "coverage": 5}
    },
    {
        "id": "tc_006",
        "type": "test_case",
        "quality": "good",
        "text": """Test Case: Search with Empty Query
Precondition: Search feature is enabled
Steps:
1. Navigate to search bar
2. Leave input empty
3. Press Enter or click Search
Expected Result: A validation message 'Please enter a search term' is displayed. No API call is made.""",
        "explanation": "Good: Edge case covered, API call prevention validated. Missing postcondition.",
        "quality_scores": {"clarity": 5, "traceability": 4, "accuracy": 4, "completeness": 3, "coverage": 4}
    },
    {
        "id": "tc_007",
        "type": "test_case",
        "quality": "poor",
        "text": "Check that the payment page works correctly and payments go through.",
        "explanation": "Poor: No steps, no data, no expected results, too vague to be repeatable or useful.",
        "quality_scores": {"clarity": 1, "traceability": 1, "accuracy": 1, "completeness": 1, "coverage": 2}
    },
]

ALL_ENTRIES = USER_STORIES + TEST_CASES
