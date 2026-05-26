import { BadRequestException } from '@nestjs/common';
import { AwardState } from '@prisma/client';

const VALID_TRANSITIONS: Record<AwardState, AwardState[]> = {
  ELIGIBLE: [AwardState.APPROVED, AwardState.ELIGIBLE],
  APPROVED: [AwardState.PURCHASED, AwardState.ELIGIBLE],
  PURCHASED: [AwardState.DISTRIBUTED, AwardState.ELIGIBLE],
  DISTRIBUTED: [AwardState.RECONCILED, AwardState.ELIGIBLE],
  RECONCILED: [AwardState.ELIGIBLE],
};

export function isValidAwardTransition(fromState: AwardState, toState: AwardState): boolean {
  return VALID_TRANSITIONS[fromState].includes(toState);
}

export function assertValidAwardTransition(fromState: AwardState, toState: AwardState): void {
  if (isValidAwardTransition(fromState, toState)) {
    return;
  }

  throw new BadRequestException(
    `Invalid state transition from ${fromState} to ${toState}. Valid transitions: ${VALID_TRANSITIONS[
      fromState
    ].join(', ')}`,
  );
}

export function getAwardValidNextStates(state: AwardState): AwardState[] {
  return VALID_TRANSITIONS[state];
}
