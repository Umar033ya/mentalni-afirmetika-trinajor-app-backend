import { userService } from "../users/user.service";

export const presenceService = {
  async heartbeat(userId: string): Promise<void> {
    await userService.touchPresence(userId, true);
  },
  async heartbeatOff(userId: string): Promise<void> {
    await userService.touchPresence(userId, false);
  }
};
