import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import type { AppData, Assessment, MembraneUnit } from "@/types";
import { loadData, saveData, normalizeAssessment } from "./storage";
import { generateId } from "@/utils/uuid";

// ---- Actions ----
type Action =
  | { type: "LOAD_DATA"; payload: AppData }
  | { type: "SAVE_ASSESSMENT"; payload: Assessment }
  | { type: "IMPORT_ASSESSMENTS"; payload: Assessment[] }
  | { type: "DELETE_ASSESSMENT"; payload: string }
  | { type: "ADD_MEMBRANE"; payload: MembraneUnit }
  | { type: "LOAD_DEMO" };

// ---- Context ----
interface AppContextType {
  data: AppData;
  dispatch: React.Dispatch<Action>;
  saveAssessment: (a: Assessment) => void;
  importAssessments: (assessments: Assessment[]) => void;
  deleteAssessment: (id: string) => void;
  getAssessment: (id: string) => Assessment | undefined;
  assessments: Assessment[];
  membranes: MembraneUnit[];
}

const AppContext = createContext<AppContextType | null>(null);

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case "LOAD_DATA":
      return action.payload;
    case "SAVE_ASSESSMENT": {
      const existing = state.assessments.findIndex((a) => a.id === action.payload.id);
      const updated =
        existing >= 0
          ? state.assessments.map((a, i) => (i === existing ? action.payload : a))
          : [action.payload, ...state.assessments];
      return { ...state, assessments: updated };
    }
    case "IMPORT_ASSESSMENTS": {
      const byId = new Map(state.assessments.map((assessment) => [assessment.id, assessment]));
      for (const assessment of action.payload) byId.set(assessment.id, assessment);
      return { ...state, assessments: Array.from(byId.values()) };
    }
    case "DELETE_ASSESSMENT":
      return { ...state, assessments: state.assessments.filter((a) => a.id !== action.payload) };
    case "ADD_MEMBRANE":
      return { ...state, membranes: [...state.membranes, action.payload] };
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, dispatch] = useReducer(reducer, null, () => {
    return loadData();
  });

  // Persist on change
  useEffect(() => {
    saveData(data);
  }, [data]);

  const saveAssessment = useCallback(
    (assessment: Assessment) => {
      const a = normalizeAssessment({
        ...assessment,
        id: assessment.id || generateId(),
        updatedAt: new Date().toISOString(),
      });
      dispatch({ type: "SAVE_ASSESSMENT", payload: a });
    },
    [dispatch]
  );

  const importAssessments = useCallback(
    (assessments: Assessment[]) => {
      dispatch({
        type: "IMPORT_ASSESSMENTS",
        payload: assessments.map(normalizeAssessment),
      });
    },
    [dispatch]
  );

  const deleteAssessment = useCallback(
    (id: string) => dispatch({ type: "DELETE_ASSESSMENT", payload: id }),
    [dispatch]
  );

  const getAssessment = useCallback(
    (id: string) => data.assessments.find((a) => a.id === id),
    [data.assessments]
  );

  return (
    <AppContext.Provider
      value={{
        data,
        dispatch,
        saveAssessment,
        importAssessments,
        deleteAssessment,
        getAssessment,
        assessments: data.assessments,
        membranes: data.membranes,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
