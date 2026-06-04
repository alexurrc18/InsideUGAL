import { Dimensions } from "react-native";
import { Spacing } from "@/constants/theme";
import type { ReactElement } from "react";

const { width } = Dimensions.get("window");
export const CAROUSEL_CARD_WIDTH = width * 0.85;
export const CAROUSEL_CARD_MARGIN = Spacing.lg;

export interface CarouselProps<T> {
    data: T[];
    renderItem: ({ item, index }: { item: T; index: number }) => ReactElement;
    keyExtractor: (item: T, index: number) => string;
    title?: string;
    viewAllHref?: string;
}
