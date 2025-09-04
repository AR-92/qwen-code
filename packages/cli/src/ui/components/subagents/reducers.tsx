/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CreationWizardState,
  WizardAction,
  ManagementDialogState,
  ManagementAction,
  MANAGEMENT_STEPS,
} from './types.js';
import { WIZARD_STEPS, TOTAL_WIZARD_STEPS } from './constants.js';

export { MANAGEMENT_STEPS };

/**
 * Initial state for the creation wizard.
 */
export const initialWizardState: CreationWizardState = {
  currentStep: WIZARD_STEPS.LOCATION_SELECTION,
  location: 'project',
  generationMethod: 'qwen',
  userDescription: '',
  generatedSystemPrompt: '',
  generatedDescription: '',
  generatedName: '',
  selectedTools: 'all',
  backgroundColor: 'auto',
  isGenerating: false,
  validationErrors: [],
  canProceed: false,
};

/**
 * Reducer for managing wizard state transitions.
 */
export function wizardReducer(
  state: CreationWizardState,
  action: WizardAction,
): CreationWizardState {
  switch (action.type) {
    case 'SET_STEP':
      return {
        ...state,
        currentStep: Math.max(
          WIZARD_STEPS.LOCATION_SELECTION,
          Math.min(TOTAL_WIZARD_STEPS, action.step),
        ),
        validationErrors: [],
      };

    case 'SET_LOCATION':
      return {
        ...state,
        location: action.location,
        canProceed: true,
      };

    case 'SET_GENERATION_METHOD':
      return {
        ...state,
        generationMethod: action.method,
        canProceed: true,
      };

    case 'SET_USER_DESCRIPTION':
      return {
        ...state,
        userDescription: action.description,
        canProceed: action.description.trim().length >= 0,
      };

    case 'SET_GENERATED_CONTENT':
      return {
        ...state,
        generatedName: action.name,
        generatedDescription: action.description,
        generatedSystemPrompt: action.systemPrompt,
        isGenerating: false,
        canProceed: true,
      };

    case 'SET_TOOLS':
      return {
        ...state,
        selectedTools: action.tools,
        canProceed: true,
      };

    case 'SET_BACKGROUND_COLOR':
      return {
        ...state,
        backgroundColor: action.color,
        canProceed: true,
      };

    case 'SET_GENERATING':
      return {
        ...state,
        isGenerating: action.isGenerating,
        canProceed: !action.isGenerating,
      };

    case 'SET_VALIDATION_ERRORS':
      return {
        ...state,
        validationErrors: action.errors,
        canProceed: action.errors.length === 0,
      };

    case 'GO_TO_NEXT_STEP':
      if (state.canProceed && state.currentStep < TOTAL_WIZARD_STEPS) {
        return {
          ...state,
          currentStep: state.currentStep + 1,
          validationErrors: [],
          canProceed: validateStep(state.currentStep + 1, state),
        };
      }
      return state;

    case 'GO_TO_PREVIOUS_STEP':
      if (state.currentStep > WIZARD_STEPS.LOCATION_SELECTION) {
        return {
          ...state,
          currentStep: state.currentStep - 1,
          validationErrors: [],
          canProceed: validateStep(state.currentStep - 1, state),
        };
      }
      return state;

    case 'RESET_WIZARD':
      return initialWizardState;

    default:
      return state;
  }
}

/**
 * Validates whether a step can proceed based on current state.
 */
function validateStep(step: number, state: CreationWizardState): boolean {
  switch (step) {
    case WIZARD_STEPS.LOCATION_SELECTION: // Location selection
      return true; // Always can proceed from location selection

    case WIZARD_STEPS.GENERATION_METHOD: // Generation method
      return true; // Always can proceed from method selection

    case WIZARD_STEPS.DESCRIPTION_INPUT: // Description input
      return state.userDescription.trim().length >= 0;

    case WIZARD_STEPS.TOOL_SELECTION: // Tool selection
      return (
        state.generatedName.length > 0 &&
        state.generatedDescription.length > 0 &&
        state.generatedSystemPrompt.length > 0
      );

    case WIZARD_STEPS.COLOR_SELECTION: // Color selection
      return true; // Always can proceed from tool selection

    case WIZARD_STEPS.FINAL_CONFIRMATION: // Final confirmation
      return state.backgroundColor.length > 0;

    default:
      return false;
  }
}

/**
 * Initial state for the management dialog.
 */
export const initialManagementState: ManagementDialogState = {
  currentStep: MANAGEMENT_STEPS.AGENT_SELECTION,
  availableAgents: [],
  selectedAgent: null,
  selectedAgentIndex: -1,
  selectedAction: null,
  isLoading: false,
  error: null,
  canProceed: false,
};

/**
 * Reducer for managing management dialog state transitions.
 */
export function managementReducer(
  state: ManagementDialogState,
  action: ManagementAction,
): ManagementDialogState {
  switch (action.type) {
    case 'SET_AVAILABLE_AGENTS':
      return {
        ...state,
        availableAgents: action.payload,
        canProceed: action.payload.length > 0,
      };

    case 'SELECT_AGENT':
      return {
        ...state,
        selectedAgent: action.payload.agent,
        selectedAgentIndex: action.payload.index,
        canProceed: true,
      };

    case 'SELECT_ACTION':
      return {
        ...state,
        selectedAction: action.payload,
        canProceed: true,
      };

    case 'GO_TO_NEXT_STEP': {
      const nextStep = state.currentStep + 1;
      return {
        ...state,
        currentStep: nextStep,
        canProceed: getCanProceedForStep(nextStep, state),
      };
    }

    case 'GO_TO_PREVIOUS_STEP': {
      const prevStep = Math.max(
        MANAGEMENT_STEPS.AGENT_SELECTION,
        state.currentStep - 1,
      );
      return {
        ...state,
        currentStep: prevStep,
        canProceed: getCanProceedForStep(prevStep, state),
      };
    }

    case 'GO_TO_STEP':
      return {
        ...state,
        currentStep: action.payload,
        canProceed: getCanProceedForStep(action.payload, state),
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'SET_CAN_PROCEED':
      return {
        ...state,
        canProceed: action.payload,
      };

    case 'RESET_DIALOG':
      return initialManagementState;

    default:
      return state;
  }
}

/**
 * Validates whether a management step can proceed based on current state.
 */
function getCanProceedForStep(
  step: number,
  state: ManagementDialogState,
): boolean {
  switch (step) {
    case MANAGEMENT_STEPS.AGENT_SELECTION:
      return state.availableAgents.length > 0 && state.selectedAgent !== null;
    case MANAGEMENT_STEPS.ACTION_SELECTION:
      return state.selectedAction !== null;
    case MANAGEMENT_STEPS.AGENT_VIEWER:
      return true; // Can always go back from viewer
    case MANAGEMENT_STEPS.AGENT_EDITOR:
      return true; // TODO: Add validation for editor
    case MANAGEMENT_STEPS.DELETE_CONFIRMATION:
      return true; // Can always proceed from confirmation
    default:
      return false;
  }
}
