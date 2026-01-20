# Matching & Online Count Issues

## 1. Matchmaking "Failure"
**Symptom:** "PC und Handy finden sich nicht."
**Cause:** Same User ID.
The user is logged in with the same Google Account on both devices.
The server explicitly prevents matching a user with themselves (`user1.id === user2.id`).

**Solution:**
Test with **two different accounts**.

## 2. Online Count "0"
**Symptom:** "Online Count is 0."
**Possible Causes:**
- Server counter reset (deployment).
- Socket connection glitch.
- `webrtcManager` callbacks set too late (Fixed in v106, should work).

**Action:**
Monitor after stable connection with 2 distinct users.
