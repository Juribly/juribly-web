// juribly-web/src/hooks/useMultiplayer.test.js
import { renderHook, act } from "@testing-library/react";
import { vi, expect, test } from "vitest";

const listeners = {};
const mockSocket = {
  connected: true,
  emit: vi.fn((evt, payload, cb) => {
    if (evt === "startTrial") cb && cb({ trialId: "trial-new" });
  }),
  on: vi.fn((evt, cb) => { listeners[evt] = cb; }),
  off: vi.fn((evt) => { delete listeners[evt]; }),
  connect: vi.fn(),
};
vi.mock("../lib/socket.js", () => ({ default: mockSocket }));

import useMultiplayer from "./useMultiplayer.js";

test("startTrial resets participants and returns new id", async () => {
  const { result } = renderHook(() => useMultiplayer());
  await act(() => {
    listeners["presence:state"]?.({ participants: [{ socketId: "a" }] });
  });
  expect(result.current.participants.size).toBe(1);
  let id;
  await act(async () => {
    id = await result.current.startTrial();
  });
  expect(id).toBe("trial-new");
  expect(result.current.participants.size).toBe(0);
});
