import { createSlice, PayloadAction, configureStore } from "@reduxjs/toolkit";
import type { ThemePreference, User } from "@rhemavoice/shared";
import { Provider, useDispatch, useSelector } from "react-redux";

type AuthState = {
  user: User | null;
  hydrated: boolean;
};

const authSlice = createSlice({
  name: "auth",
  initialState: { user: null, hydrated: false } as AuthState,
  reducers: {
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
    },
    setHydrated(state, action: PayloadAction<boolean>) {
      state.hydrated = action.payload;
    },
    setThemeLocal(state, action: PayloadAction<ThemePreference>) {
      if (state.user) state.user.theme_preference = action.payload;
    },
  },
});

export const { setUser, setHydrated, setThemeLocal } = authSlice.actions;

export const store = configureStore({
  reducer: { auth: authSlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T,>(sel: (s: RootState) => T) => useSelector(sel);
export { Provider };
