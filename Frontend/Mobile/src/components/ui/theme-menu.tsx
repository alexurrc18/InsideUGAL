// Meniu de tema (DOAR web). Trigger = iconita cog (rotita). La apasare:
//  - cog-ul se roteste (90deg)
//  - sub el apare, cu fade + slide, cercul cu luna/soare (ThemeToggle) care comuta tema.
// Se inchide la a doua apasare pe cog. Trebuie montat intr-un <ThemeProvider>.
import { useEffect, useState } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import { ColorScheme } from "@/constants/theme";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import CogIcon from "@/assets/icons/svg/cog.svg";

// `solid` = starea navbarului. Cand e solid (albastru), cercul de tema e albastru
// (se potriveste). Cand navbarul e transparent (peste hero), cercul devine
// intunecat translucid ca sa nu mai fie un albastru care pluteste peste imagine.
export function ThemeMenu({ solid = true }: { solid?: boolean }) {
  const [open, setOpen] = useState(false);
  const [anim] = useState(() => new Animated.Value(0)); // 0 = inchis, 1 = deschis

  const circleBg = solid ? ColorScheme.blue : "rgba(0,0,0,0.45)";

  const toggle = () => {
    const next = !open;
    setOpen(next);
    Animated.timing(anim, {
      toValue: next ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  // Cand meniul e deschis si pagina e derulata, il inchidem inapoi (cu animatia
  // inversa). Scroll-ul se intampla in ScrollView-ul paginii, deci ascultam in
  // faza de CAPTURE pe document, ca sa prindem orice container care deruleaza.
  useEffect(() => {
    if (!open) return;
    const closeOnScroll = () => {
      setOpen(false);
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };
    document.addEventListener("scroll", closeOnScroll, true);
    return () => document.removeEventListener("scroll", closeOnScroll, true);
  }, [open, anim]);

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "90deg"] });
  const dropTranslate = anim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });

  return (
    <View style={{ position: "relative" }}>
      {/* Trigger: cog (rotund, border alb ca sa se vada pe navbarul albastru). */}
      <Pressable
        onPress={toggle}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Setări temă"
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <View
          style={{
            padding: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: ColorScheme.white,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Animated.View style={{ transform: [{ rotate }] }}>
            <CogIcon width={20} height={20} color={ColorScheme.white} />
          </Animated.View>
        </View>
      </Pressable>

      {/* Dropdown: cercul lună/soare, apare in jos cu fade + slide. */}
      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        style={{
          position: "absolute",
          top: "100%",
          right: 0,
          marginTop: 10,
          opacity: anim,
          transform: [{ translateY: dropTranslate }],
        }}
      >
        {/* Cerc cu border alb, EXACT cat rotita (size 20) ca sa fie centrat.
            Fundalul (albastru / intunecat) urmeaza starea navbarului. */}
        <ThemeToggle size={20} backgroundColor={circleBg} borderColor={ColorScheme.white} color={ColorScheme.white} />
      </Animated.View>
    </View>
  );
}
