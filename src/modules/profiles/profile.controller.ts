import { Request, Response } from "express";
import { ok } from "../../utils/response";
import { userService } from "../users/user.service";
import { toSelfUser } from "../users/user.mapper";
import { profileService } from "./profile.service";

export const profileController = {
  async getMe(req: Request, res: Response): Promise<void> {
    const [userRow, profile] = await Promise.all([
      userService.getMe(req.user!.id),
      profileService.getMyProfile(req.user!.id)
    ]);
    ok(res, { user: toSelfUser(userRow), profile });
  },

  async updateMe(req: Request, res: Response): Promise<void> {
    const profile = await profileService.updateMyProfile(req.user!.id, {
      bio: req.body.bio,
      country: req.body.country,
      birthday: req.body.birthday
    });
    ok(res, profile);
  }
};
