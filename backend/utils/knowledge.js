const USER_STORIES = [
    {
        "id": "us_001",
        "type": "user_story",
        "quality": "excellent",
        "text": "As a registered customer, I want to reset my password via email so that I can regain access to my account if I forget my credentials.",
        "explanation": "Excellent: Independent (no dependency chain), negotiable, directly valuable to users, estimable in 1-2 days, small enough for one sprint, testable with clear acceptance criteria.",
    },
    {
        "id": "us_003",
        "type": "user_story",
        "quality": "good",
        "text": "As a shopper, I want to filter products by category and price range so that I can quickly find items within my budget.",
        "explanation": "Good: Valuable and testable but slightly less independent — depends on product listing existing. Estimable but requires UI work.",
    },
    {
        "id": "us_004",
        "type": "user_story",
        "quality": "poor",
        "text": "As a user, I want the system to be fast.",
        "explanation": "Poor: Vague actor, no specific action, not testable (no measurable criteria), not estimable, not small (performance is cross-cutting).",
    }
];

const TEST_CASES = [
    {
        "id": "tc_001",
        "type": "test_case",
        "quality": "excellent",
        "text": "Test Case: Valid Login\nPrecondition: User is registered with email test@example.com and password Test@123\nSteps:\n1. Navigate to login page\n2. Enter email: test@example.com\n3. Enter password: Test@123\n4. Click Login button\nExpected Result: User is redirected to dashboard. Session token is created. Welcome message shows user's name.",
        "explanation": "Excellent: Clear preconditions, atomic steps, precise expected result with multiple verifiable assertions.",
    },
    {
        "id": "tc_003",
        "type": "test_case",
        "quality": "poor",
        "text": "Test the login screen and make sure it works. Check that error messages appear when needed.",
        "explanation": "Very poor: No steps, no expected results, vague preconditions, not repeatable or automatable.",
    },
    {
        "id": "tc_005",
        "type": "test_case",
        "quality": "excellent",
        "text": "Test Case: Add to Cart - Out of Stock Item\nPrecondition: Product 'Widget X' has stock quantity = 0\nSteps:\n1. Navigate to product page for 'Widget X'\n2. Verify 'Add to Cart' button is disabled or shows 'Out of Stock'\nExpected Result: UI shows 'Out of Stock' badge. API returns 409 with message 'Product out of stock'. Cart count unchanged.",
        "explanation": "Excellent: Validates both UI and API layers, boundary condition, clear postcondition.",
    }
];

function getFallbackExamples(type) {
    if (type === "user_story") {
        return USER_STORIES;
    } else if (type === "test_case") {
        return TEST_CASES;
    }
    return [...USER_STORIES.slice(0,2), ...TEST_CASES.slice(0,2)];
}

module.exports = { getFallbackExamples };
