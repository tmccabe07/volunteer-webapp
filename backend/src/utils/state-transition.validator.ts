/**
 * State Transition Validator Utility
 * 
 * Validates state machine transitions for award fulfillment workflow
 * per research.md state machine patterns
 */

import { BadRequestException } from '@nestjs/common';

/**
 * Award state machine states per data-model.md
 */
export enum AwardState {
  ELIGIBLE = 'ELIGIBLE',
  APPROVED = 'APPROVED',
  PURCHASED = 'PURCHASED',
  DISTRIBUTED = 'DISTRIBUTED',
  RECONCILED = 'RECONCILED'
}

/**
 * Valid state transitions for award fulfillment
 * 
 * State machine flow:
 * ELIGIBLE → APPROVED → PURCHASED → DISTRIBUTED → RECONCILED
 * 
 * Special transitions:
 * - Any state can transition to ELIGIBLE (reset)
 */
const VALID_TRANSITIONS: Record<AwardState, AwardState[]> = {
  [AwardState.ELIGIBLE]: [AwardState.APPROVED, AwardState.ELIGIBLE],
  [AwardState.APPROVED]: [AwardState.PURCHASED, AwardState.ELIGIBLE],
  [AwardState.PURCHASED]: [AwardState.DISTRIBUTED, AwardState.ELIGIBLE],
  [AwardState.DISTRIBUTED]: [AwardState.RECONCILED, AwardState.ELIGIBLE],
  [AwardState.RECONCILED]: [AwardState.ELIGIBLE] // Allow reset for corrections
};

/**
 * Validate if a state transition is allowed
 * 
 * @param fromState - Current state
 * @param toState - Desired next state
 * @returns true if transition is valid
 */
export function isValidTransition(fromState: AwardState, toState: AwardState): boolean {
  const validNextStates = VALID_TRANSITIONS[fromState];
  return validNextStates.includes(toState);
}

/**
 * Validate state transition or throw BadRequestException
 * 
 * @param fromState - Current state
 * @param toState - Desired next state
 * @throws BadRequestException if transition is invalid
 */
export function validateTransition(fromState: AwardState, toState: AwardState): void {
  if (!isValidTransition(fromState, toState)) {
    throw new BadRequestException(
      `Invalid state transition from ${fromState} to ${toState}. ` +
      `Valid transitions from ${fromState}: ${VALID_TRANSITIONS[fromState].join(', ')}`
    );
  }
}

/**
 * Get all valid next states for current state
 * 
 * @param currentState - Current award state
 * @returns Array of valid next states
 */
export function getValidNextStates(currentState: AwardState): AwardState[] {
  return VALID_TRANSITIONS[currentState];
}

/**
 * Check if state is terminal (no forward transitions except reset)
 * 
 * @param state - Award state to check
 * @returns true if state is terminal
 */
export function isTerminalState(state: AwardState): boolean {
  return state === AwardState.RECONCILED;
}

/**
 * Get human-readable state description
 * 
 * @param state - Award state
 * @returns Description of the state
 */
export function getStateDescription(state: AwardState): string {
  const descriptions: Record<AwardState, string> = {
    [AwardState.ELIGIBLE]: 'Child has completed requirements and is eligible for award',
    [AwardState.APPROVED]: 'Award has been approved by den leader',
    [AwardState.PURCHASED]: 'Award has been purchased by advancement coordinator',
    [AwardState.DISTRIBUTED]: 'Award has been distributed to child',
    [AwardState.RECONCILED]: 'Award has been reconciled with Scoutbook'
  };

  return descriptions[state];
}

/**
 * State transition validator with audit trail support
 */
export class StateTransitionValidator {
  /**
   * Validate and prepare state transition with audit metadata
   * 
   * @param fromState - Current state
   * @param toState - Desired next state
   * @param transitionedBy - User ID performing transition
   * @param transitionReason - Optional reason for transition
   * @returns Audit metadata for the transition
   */
  static validateAndPrepareTransition(
    fromState: AwardState,
    toState: AwardState,
    transitionedBy: string,
    transitionReason?: string
  ) {
    validateTransition(fromState, toState);

    return {
      fromState,
      toState,
      transitionedBy,
      transitionedAt: new Date(),
      transitionReason: transitionReason || `Transition from ${fromState} to ${toState}`
    };
  }

  /**
   * Check if transition requires specific permissions
   * 
   * @param fromState - Current state
   * @param toState - Desired next state
   * @returns Required permission level
   */
  static getRequiredPermission(fromState: AwardState, toState: AwardState): string {
    // ELIGIBLE → APPROVED: Requires den leader or higher
    if (fromState === AwardState.ELIGIBLE && toState === AwardState.APPROVED) {
      return 'LEADER';
    }

    // APPROVED → PURCHASED: Requires advancement coordinator or admin
    if (fromState === AwardState.APPROVED && toState === AwardState.PURCHASED) {
      return 'LEADER';
    }

    // PURCHASED → DISTRIBUTED: Requires den leader or higher
    if (fromState === AwardState.PURCHASED && toState === AwardState.DISTRIBUTED) {
      return 'LEADER';
    }

    // DISTRIBUTED → RECONCILED: Requires advancement coordinator or admin
    if (fromState === AwardState.DISTRIBUTED && toState === AwardState.RECONCILED) {
      return 'LEADER';
    }

    // Reset transitions require admin
    if (toState === AwardState.ELIGIBLE && fromState !== AwardState.ELIGIBLE) {
      return 'ADMIN';
    }

    return 'LEADER'; // Default
  }
}
