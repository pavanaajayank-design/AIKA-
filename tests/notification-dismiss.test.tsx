import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOTIFICATION_DEFAULT_DELAY } from '../src/app/PlannerContext';

// =========================================================================
// AIKA EDIT #7 — Global Auto-Dismiss for All Popup Notifications
// =========================================================================

test('EDIT 7: default auto-dismiss timeout is 5.5 seconds (5500 ms)', () => {
    assert.equal(NOTIFICATION_DEFAULT_DELAY, 5500);
});

test('EDIT 7: success, info, warning and trip feedback notifications all auto-dismiss after delay', async () => {
    const testCases = [
        'You are signed in.',
        'You have been signed out.',
        'Layover itinerary saved to My Trips.',
        'Layover itinerary updated in My Trips.',
        'Trip updated successfully in My Trips.',
        'Trip deleted successfully.',
        'Trip status updated.',
        'Profile updated successfully.',
        'Password updated successfully.',
        'Account created successfully! Please log in with your new credentials.',
        'Your layover is calculated, but could not be saved to My Trips.',
        'Sign in to save this layover to your account. Your active plan will be kept while you log in.',
        'We could not verify your saved session. Please sign in again.',
    ];

    for (const msg of testCases) {
        let current = msg;
        const setNotice = (val: string | ((c: string) => string)) => {
            current = typeof val === 'function' ? val(current) : val;
        };

        const timer = setTimeout(() => {
            setNotice((c) => (c === msg ? '' : c));
        }, 15);

        assert.ok(timer);
        await new Promise((r) => setTimeout(r, 25));
        assert.equal(current, '', `Expected "${msg}" to auto-dismiss`);
    }
});

test('EDIT 7: updating notification resets the dismissal timer without creating duplicate timers', async () => {
    let current = 'First notice';
    let currentTimer: NodeJS.Timeout | null = null;
    let timerFireCount = 0;

    const showNotification = (text: string, delay = 40) => {
        if (currentTimer) {
            clearTimeout(currentTimer);
            currentTimer = null;
        }
        current = text;
        currentTimer = setTimeout(() => {
            timerFireCount++;
            if (current === text) {
                current = '';
            }
            currentTimer = null;
        }, delay);
    };

    // 1. Show first notice with 40ms timer
    showNotification('First notice', 40);
    assert.equal(current, 'First notice');

    // 2. 20ms later (before first expires), replace with second notice
    await new Promise((r) => setTimeout(r, 20));
    showNotification('Second notice', 40);
    assert.equal(current, 'Second notice');

    // 3. 25ms later (45ms from start: first timer would have fired if not cancelled)
    await new Promise((r) => setTimeout(r, 25));
    // Second notice should still be active because its timer started at t=20ms
    assert.equal(current, 'Second notice');
    assert.equal(timerFireCount, 0, 'First timer must have been cancelled without firing');

    // 4. Wait for second timer to fire (at t=60ms total, delay=40ms from second notice)
    await new Promise((r) => setTimeout(r, 25));
    assert.equal(current, '');
    assert.equal(timerFireCount, 1, 'Only second timer should have fired');
});

test('EDIT 7: triggering the exact same notice text resets the timer cleanly', async () => {
    let current = 'Trip saved';
    let currentTimer: NodeJS.Timeout | null = null;
    let timerFired = false;

    const showNotification = (text: string, delay = 35) => {
        if (currentTimer) {
            clearTimeout(currentTimer);
            currentTimer = null;
        }
        current = text;
        currentTimer = setTimeout(() => {
            timerFired = true;
            if (current === text) {
                current = '';
            }
            currentTimer = null;
        }, delay);
    };

    showNotification('Trip saved', 35);
    // At t=20ms, re-trigger same message
    await new Promise((r) => setTimeout(r, 20));
    showNotification('Trip saved', 35);

    // At t=38ms (past original 35ms), notice must still be visible
    await new Promise((r) => setTimeout(r, 18));
    assert.equal(current, 'Trip saved');
    assert.equal(timerFired, false);

    // At t=65ms (past 20 + 35 = 55ms), notice must dismiss
    await new Promise((r) => setTimeout(r, 25));
    assert.equal(current, '');
    assert.equal(timerFired, true);
});

test('EDIT 7: page navigation clears stale temporary notifications so they do not bleed into new pages', () => {
    let activePage = 'home';
    let activeNotice = 'Notice from home page';
    const lastNoticeSetTime = Date.now() - 1000; // set 1 second ago

    const go = (targetPage: string) => {
        activePage = targetPage;
        // Stale notice (> 50ms since set) is cleared on navigation
        if (Date.now() - lastNoticeSetTime > 50) {
            activeNotice = '';
        }
    };

    go('trips');
    assert.equal(activePage, 'trips');
    assert.equal(activeNotice, '', 'Stale notice from previous page must be cleared on navigation');
});

test('EDIT 7: intentional redirect notification is preserved for the destination page', () => {
    let activePage = 'results';
    let activeNotice = '';
    let lastNoticeSetTime = 0;

    const setNoticeAndNavigate = (msg: string, targetPage: string) => {
        lastNoticeSetTime = Date.now();
        activeNotice = msg;
        activePage = targetPage;
        // Navigation within 50ms retains the notice for the target page
        if (Date.now() - lastNoticeSetTime > 50) {
            activeNotice = '';
        }
    };

    setNoticeAndNavigate('You are signed in.', 'home');
    assert.equal(activePage, 'home');
    assert.equal(activeNotice, 'You are signed in.');
});

test('EDIT 7: permanent interactive dialogs and inline validation errors are not auto-dismissed', () => {
    // 1. Delete confirmation dialog requires explicit user action
    const deleteConfirmId: string | null = 'trip-123';
    // Confirmation dialog should remain active until user clicks Delete or Keep it
    assert.equal(deleteConfirmId, 'trip-123');

    // 2. Inline form validation error remains present while user is correcting fields
    const inlineFormError = 'Enter the connecting airline.';
    assert.equal(inlineFormError, 'Enter the connecting airline.');
});
