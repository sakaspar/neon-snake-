/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface MobileInputState {
  left: boolean;
  right: boolean;
  boost: boolean;
  brake: boolean;
  joystickActive: boolean;
  joystickAngle: number;
}

export const mobileInputState: MobileInputState = {
  left: false,
  right: false,
  boost: false,
  brake: false,
  joystickActive: false,
  joystickAngle: 0,
};
