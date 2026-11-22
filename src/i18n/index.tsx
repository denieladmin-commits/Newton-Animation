import { createContext, useContext } from 'react';
import type { Lang } from './format';
import { STRINGS, type Strings } from './strings';

export const LangContext = createContext<Lang>('hu');
export const useLang = (): Lang => useContext(LangContext);
export const useT = (): Strings => STRINGS[useLang()];
export type { Lang };
