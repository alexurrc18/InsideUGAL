import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  LayoutAnimation,
  UIManager,
  Linking,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { Typography } from '@/constants/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from 'expo-glass-effect';
import { InteractiveGlass } from '@/components/ui/layout/interactive-glass';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { NewsCard } from '@/components/ui/display/news-card';
import MOCK_DATA from '@/constants/mock-data.json';

import CloseIcon from '@/assets/icons/svg/x.svg';
import MessagePlusIcon from '@/assets/icons/svg/message-plus.svg';
import SendIcon from '@/assets/icons/svg/send.svg';
import SparkleIcon from '@/assets/icons/svg/message-circle-star.svg';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  imageUrl?: string;
  event?: {
    title: string;
    date: string;
    location: string;
    description: string;
    badge?: string;
    link?: string;
  };
}

const getMockResponse = (text: string): { text: string; imageUrl?: string; event?: ChatMessage['event'] } => {
  const cleanText = text.toLowerCase().trim();

  if (
    (cleanText.includes("eveniment") && cleanText.includes("cantin") && cleanText.includes("sesizar")) ||
    cleanText.includes("model de prompt")
  ) {
    return {
      text: "Salut! Iată un rezumat al informațiilor din campus pe care le avem integrate momentan:\n\n1. **Evenimente**: Gala Studenților UGAL 2026 (detalii mai jos).\n2. **Cantină**: Cantina se află în Campusul Științei. Meniul zilei poate fi vizualizat în tab-ul 'Cantină'.\n3. **Sesizări**: Poți raporta probleme (cămine, campus) direct din tab-ul 'Sesizări' folosind butonul (+).\n\nCum te mai pot ajuta?",
      imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1000&auto=format&fit=crop",
      event: {
        title: "Gala Studenților UGAL 2026",
        date: "24 Mai 2026, 18:00",
        location: "Casa de Cultură a Studenților",
        description: "Cel mai mare eveniment al primăverii! Concerte live, workshop-uri, premii și stand-uri ale asociațiilor studențești. Te așteptăm cu drag!",
        badge: "Eveniment Campus",
        link: "/(public)/acasa/vizualizare?type=Eveniment&title=Gala%20Studen%C8%9Bilor%20UGAL%202026&category=Evenimente&content=Cel%20mai%20mare%20eveniment%20al%20prim%C4%83verii!%20Concerte%20live,%20workshop-uri,%20premii%20%C8%99i%20stand-uri%20ale%20asocia%C8%9Biilor%20studen%C8%9Be%C8%99ti.%20Te%20a%C8%99tept%C4%83m%20cu%20drag!&location=Casa%20de%20Cultur%C4%83%20a%20Studen%C8%9Bilor&date_start=2026-05-24&date_end=2026-05-24&time_start=18%3A00&time_end=22%3A00&date=24%20Mai%202026,%2018%3A00&image=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1540575467063-178a50c2df87%3Fq%3D80%26w%3D1000",
      }
    };
  }

  if (
    cleanText.includes("noutat") ||
    cleanText.includes("noutăț") ||
    cleanText.includes("eveniment") ||
    cleanText.includes("poster") ||
    cleanText.includes("gala") ||
    cleanText.includes("concert")
  ) {
    return {
      text: "Iată cel mai recent eveniment organizat în campus:",
      imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1000&auto=format&fit=crop",
      event: {
        title: "Gala Studenților UGAL 2026",
        date: "24 Mai 2026, 18:00",
        location: "Casa de Cultură a Studenților",
        description: "Cel mai mare eveniment al primăverii! Concerte live, workshop-uri, premii și stand-uri ale asociațiilor studențești. Te așteptăm cu drag!",
        badge: "Eveniment Campus",
        link: "/(public)/acasa/vizualizare?type=Eveniment&title=Gala%20Studen%C8%9Bilor%20UGAL%202026&category=Evenimente&content=Cel%20mai%20mare%20eveniment%20al%20prim%C4%83verii!%20Concerte%20live,%20workshop-uri,%20premii%20%C8%99i%20stand-uri%20ale%20asocia%C8%9Biilor%20studen%C8%9Be%C8%99ti.%20Te%20a%C8%99tept%C4%83m%20cu%20drag!&location=Casa%20de%20Cultur%C4%83%20a%20Studen%C8%9Bilor&date_start=2026-05-24&date_end=2026-05-24&time_start=18%3A00&time_end=22%3A00&date=24%20Mai%202026,%2018%3A00&image=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1540575467063-178a50c2df87%3Fq%3D80%26w%3D1000",
      },
    };
  }

  if (
    cleanText.includes("cantina") ||
    cleanText.includes("mâncare") ||
    cleanText.includes("meniu") ||
    cleanText.includes("mancare") ||
    cleanText.includes("pret") ||
    cleanText.includes("preț")
  ) {
    return {
      text: "Cantina studențească se află în Campusul Științei (lângă Facultatea de Științe și Mediu). Oferă prânz la prețuri accesibile studenților, iar meniul cuprinde ciorbe, preparate calde și deserturi. Poți accesa secțiunea 'Cantină' din aplicație pentru a vedea meniul de azi actualizat."
    };
  }

  if (
    cleanText.includes("sesizare") ||
    cleanText.includes("reclamatie") ||
    cleanText.includes("problemă") ||
    cleanText.includes("problema") ||
    cleanText.includes("raport")
  ) {
    return {
      text: "Dacă ai întâmpinat o problemă în campus sau în cămine, o poți raporta direct din aplicație! Mergi în secțiunea 'Sesizări' din meniul de jos, apasă pe butonul de adăugare (+), selectează categoria și adaugă o descriere și o poză. Administrația va fi notificată imediat."
    };
  }

  if (
    cleanText.includes("harta") ||
    cleanText.includes("unde se afla") ||
    cleanText.includes("unde se află") ||
    cleanText.includes("localizare") ||
    cleanText.includes("adresa") ||
    cleanText.includes("locatie") ||
    cleanText.includes("locație") ||
    cleanText.includes("harta campus")
  ) {
    return {
      text: "Campusul UGAL este întins pe mai multe zone în Galați. Poți folosi secțiunea 'Hartă' din meniu pentru a localiza corpurile de clădire, facultățile, căminele studențești și cantina. Harta are ace de siguranță pentru fiecare locație cheie!"
    };
  }

  if (
    cleanText.includes("facultati") ||
    cleanText.includes("facultăți") ||
    cleanText.includes("facultate") ||
    cleanText.includes("specializari") ||
    cleanText.includes("acee")
  ) {
    return {
      text: "Universitatea 'Dunărea de Jos' are 14 facultăți, printre care:\n- Facultatea de Automatică, Calculatoare, Electrotehnică și Electronică (ACÉE)\n- Facultatea de Litere\n- Facultatea de Medicină și Farmacie\n- Facultatea de Științe și Mediu\n- Facultatea de Inginerie\n\nDetaliile despre secretariate și contacte le găsești în secțiunea 'Mai multe' -> 'Informații utile'."
    };
  }

  if (
    cleanText.includes("orar") ||
    cleanText.includes("cursuri") ||
    cleanText.includes("semestru") ||
    cleanText.includes("ore")
  ) {
    return {
      text: "Orarul cursurilor poate fi consultat pe platforma oficială a fiecărei facultăți sau prin grupunile de studenți. În viitor, InsideUGAL își propune să integreze orarul direct în aplicație pentru acces rapid!"
    };
  }

  if (
    cleanText.includes("camin") ||
    cleanText.includes("cămine") ||
    cleanText.includes("cazare") ||
    cleanText.includes("cazari") ||
    cleanText.includes("cazări")
  ) {
    return {
      text: "Căminele studențești UGAL sunt situate în Campusul Al. I. Cuza (Căminele A, B, C, D, G, H) și Campusul Științei (Căminele LS, Caminul 1 și 2). Pentru cereri de cazare sau sesizări privind căminele, folosește funcția 'Sesizări' din aplicație."
    };
  }

  if (
    cleanText.includes("bursa") ||
    cleanText.includes("burse") ||
    cleanText.includes("bani") ||
    cleanText.includes("sociala")
  ) {
    return {
      text: "Informații despre bursele de merit, de studiu sau sociale pot fi obținute de la secretariatul facultății tale sau de pe site-ul oficial ugal.ro, secțiunea Studenți -> Burse. De regulă, dosarele se depun la începutul fiecărui semestru."
    };
  }

  if (
    cleanText.includes("salut") ||
    cleanText.includes("buna") ||
    cleanText.includes("bună") ||
    cleanText.includes("hey") ||
    cleanText.includes("hello")
  ) {
    return {
      text: "Salut! Eu sunt Ace, asistentul tău virtual InsideUGAL. Te pot ajutor cu informații despre campus, facultăți, cantină, hărți sau cum să depui o sesizare. Cu ce te pot ajuta azi?"
    };
  }

  if (
    cleanText.includes("multumesc") ||
    cleanText.includes("mulțumesc") ||
    cleanText.includes("mersi") ||
    cleanText.includes("thanks") ||
    cleanText.includes("thank you")
  ) {
    return {
      text: "Cu mare drag! Dacă mai ai și alte întrebări, sunt aici să te ajut. O zi excelentă în campus! 🎓"
    };
  }

  if (cleanText.includes("hackathon") || cleanText.includes("inovație") || cleanText.includes("inovatie")) {
    const hackathon = MOCK_DATA.events.find(e => e.id === "2");
    return {
      text: "Iată informațiile despre **Hackathon-ul de 24 ore**: înscrierile sunt deschise!",
      imageUrl: hackathon?.image,
      event: {
        title: hackathon?.title || "",
        date: `${hackathon?.date_start}, ${hackathon?.time_start}`,
        location: hackathon?.location || "",
        description: hackathon?.content || "",
        badge: "Hackathon",
        link: "/event/2",
      }
    };
  }

  if (cleanText.includes("erasmus") || cleanText.includes("mobilitate")) {
    const erasmus = MOCK_DATA.events.find(e => e.id === "3");
    return {
      text: "Avem vești noi despre programul **Erasmus+**:",
      imageUrl: erasmus?.image,
      event: {
        title: erasmus?.title || "",
        date: erasmus?.date || "",
        location: erasmus?.author || "",
        description: erasmus?.content || "",
        badge: "Erasmus+",
        link: "/news/3",
      }
    };
  }

  return {
    text: `Interesant! Nu sunt sigur dacă am înțeles perfect întrebarea ta despre "${text}". Te pot ajuta cu detalii despre:\n1. Cantină și meniul zilei\n2. Harta campusului și facultăți\n3. Trimiterea unei sesizări\n\nÎncearcă să formulezi o întrebare mai specifică!`
  };
}

const resolveLink = (link: string): string => {
  if (!link) return "";

  let path = link;
  if (link.startsWith('http://') || link.startsWith('https://')) {
    try {
      const match = link.match(/https?:\/\/[^\/]+(\/[^?#]*\??[^#]*)/);
      if (match) {
        path = match[1];
      }
    } catch (e) {
      // Fallback
    }
  } else if (link.startsWith('insideugal://')) {
    path = '/' + link.substring('insideugal://'.length);
  }

  // Check for event paths: /event/123, /eveniment/123, etc.
  const eventMatch = path.match(/^\/?(event|eveniment)[s|e]?\/([a-zA-Z0-9_-]+)/i);
  if (eventMatch) {
    return `/(public)/acasa/vizualizare?id=${eventMatch[2]}`;
  }

  // Check for news paths: /news/123, /noutate/123, /anunt/123, etc.
  const newsMatch = path.match(/^\/?(news|noutate|anunt|noutati|anunturi)\/([a-zA-Z0-9_-]+)/i);
  if (newsMatch) {
    return `/(public)/acasa/vizualizare?id=${newsMatch[2]}`;
  }

  // Check for faculty paths: /facultate/123, /facultati/123
  const facultyMatch = path.match(/^\/?(facultate|facultati)\/([a-zA-Z0-9_-]+)/i);
  if (facultyMatch) {
    return `/(public)/acasa/vizualizare?type=Facultate&id=${facultyMatch[2]}`;
  }

  // Check for facility paths: /facilitate/123, /facilitati/123
  const facilityMatch = path.match(/^\/?(facilitate|facilitati)\/([a-zA-Z0-9_-]+)/i);
  if (facilityMatch) {
    return `/(public)/acasa/vizualizare?type=Facilitate&id=${facilityMatch[2]}`;
  }

  // Map simple internal routes to their group route if they don't have it
  if (!path.startsWith('/(public)/')) {
    if (path.startsWith('/cantina')) {
      return '/(public)/cantina';
    }
    if (path.startsWith('/harta')) {
      return '/(public)/harta';
    }
    if (path.startsWith('/sesizari')) {
      return '/(public)/sesizari';
    }
    if (path.startsWith('/acasa')) {
      return '/(public)' + path;
    }
  }

  return path;
};

let messageIdCounter = 0;
const generateMsgId = () => `msg_${Date.now()}_${++messageIdCounter}`;

const renderFormattedText = (text: string, baseStyle: any, boldStyle: any) => {
  const parts = text.split('**');
  return parts.map((part, index) => {
    const isBold = index % 2 === 1;
    return (
      <Text key={index} style={isBold ? boldStyle : baseStyle}>
        {part}
      </Text>
    );
  });
};

interface UserMessageBubbleProps {
  text: string;
  timestamp: Date;
  theme: any;
}

function UserMessageBubble({ text, timestamp, theme }: UserMessageBubbleProps) {
  return (
    <View style={{ alignSelf: 'flex-end', maxWidth: '85%', marginVertical: Spacing.xs }}>
      <View
        style={{
          borderRadius: Spacing.md,
          paddingVertical: Spacing.sm,
          paddingHorizontal: Spacing.lg,
          backgroundColor: theme.surface,
          borderBottomRightRadius: 4,
        }}
      >
        <Text style={{ ...Typography.Paragraph2, lineHeight: 22, color: theme.text }}>
          {renderFormattedText(text, { color: theme.text }, { fontWeight: '700', color: theme.text })}
        </Text>
      </View>
    </View>
  );
}

// EventCard removed to use existing NewsCard from /ui

const GlassBackground = React.memo(({ theme, themeWhite }: { theme: any; themeWhite: string }) => {
  return (
    <GlassView
      glassEffectStyle={{
        style: 'regular',
        animate: true,
      }}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        borderRadius: 32,
        borderWidth: 1.5,
        borderColor: themeWhite + '66',
        overflow: 'hidden',
        backgroundColor: theme.card + '80',
      }}
    />
  );
});
GlassBackground.displayName = 'GlassBackground';

interface ChatInputProps {
  onSend: (text: string) => void;
  theme: any;
  themeWhite: string;
}

function ChatInput({ onSend, theme, themeWhite }: ChatInputProps) {
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setKeyboardVisible(true);
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setKeyboardVisible(false);
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleSendPress = () => {
    if (!inputText.trim()) return;
    onSend(inputText);
    setInputText('');
  };

  const isTextEmpty = !inputText.trim();

  return (
    <View
      style={{
        width: '100%',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        gap: Spacing.sm,
        paddingBottom: keyboardVisible ? Spacing.sm : Math.max(insets.bottom, Spacing.md),
        backgroundColor: 'transparent',
      }}
    >
      {/* Input Field (Liquid Glass Wrapper) */}
      {Platform.OS === 'ios' ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            height: 64,
            position: 'relative',
            width: '100%',
            backgroundColor: 'transparent',
          }}
        >
          <GlassBackground theme={theme} themeWhite={themeWhite} />
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Pune o întrebare..."
            placeholderTextColor={theme.textSecondary}
            onFocus={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            }}
            style={{
              flex: 1,
              height: '100%',
              paddingLeft: Spacing.lg,
              paddingRight: 68,
              ...Typography.Paragraph2,
              color: theme.text,
              backgroundColor: 'transparent',
            }}
            returnKeyType="send"
            onSubmitEditing={handleSendPress}
          />
          <Pressable
            onPress={handleSendPress}
            disabled={isTextEmpty}
            style={({ pressed }) => [
              {
                position: 'absolute',
                right: Spacing.sm,
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
              },
              {
                backgroundColor: !isTextEmpty ? theme.primary : theme.background,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <SendIcon width={18} height={18} color={!isTextEmpty ? themeWhite : theme.textSecondary} />
          </Pressable>
        </View>
      ) : (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            height: 64,
            borderRadius: 32,
            borderWidth: 1.5,
            borderColor: themeWhite + '40',
            position: 'relative',
            width: '100%',
            backgroundColor: theme.card,
          }}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Pune o întrebare..."
            placeholderTextColor={theme.textSecondary}
            onFocus={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            }}
            style={{
              flex: 1,
              height: '100%',
              paddingLeft: Spacing.lg,
              paddingRight: 68,
              ...Typography.Paragraph2,
              color: theme.text,
            }}
            returnKeyType="send"
            onSubmitEditing={handleSendPress}
          />
          <Pressable
            onPress={handleSendPress}
            disabled={isTextEmpty}
            style={({ pressed }) => [
              {
                position: 'absolute',
                right: Spacing.sm,
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
              },
              {
                backgroundColor: !isTextEmpty ? theme.primary : theme.background,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <SendIcon width={18} height={18} color={!isTextEmpty ? themeWhite : theme.textSecondary} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

function GradientSpinner() {
  const [rotateAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate }], width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Defs>
          <SvgLinearGradient id="ace-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#3476d6" />
            <Stop offset="30%" stopColor="#5861b8" />
            <Stop offset="65%" stopColor="#742d73" />
            <Stop offset="100%" stopColor="#dc1647" />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={12}
          cy={12}
          r={9}
          stroke="url(#ace-grad)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="40 16"
        />
      </Svg>
    </Animated.View>
  );
}

export default function AceScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerMiddleRatio = (insets.top + 36) / (72 + insets.top + 50);
  const router = useRouter();
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const flatListRef = useRef<FlatList>(null);

  const [scaleClearAnim] = useState(() => new Animated.Value(1));
  const [scaleCloseAnim] = useState(() => new Animated.Value(1));

  const handlePressInClear = () => {
    Animated.spring(scaleClearAnim, {
      toValue: 1.12,
      useNativeDriver: true,
      stiffness: 300,
      damping: 15,
      mass: 0.5,
    }).start();
  };

  const handlePressOutClear = () => {
    Animated.spring(scaleClearAnim, {
      toValue: 1.0,
      useNativeDriver: true,
      stiffness: 300,
      damping: 15,
      mass: 0.5,
    }).start();
  };

  const handlePressInClose = () => {
    Animated.spring(scaleCloseAnim, {
      toValue: 1.12,
      useNativeDriver: true,
      stiffness: 300,
      damping: 15,
      mass: 0.5,
    }).start();
  };

  const handlePressOutClose = () => {
    Animated.spring(scaleCloseAnim, {
      toValue: 1.0,
      useNativeDriver: true,
      stiffness: 300,
      damping: 15,
      mass: 0.5,
    }).start();
  };

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setKeyboardVisible(true);
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setKeyboardVisible(false);
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const themeWhite = theme.textOnDark === '#F8F9FA' ? theme.textOnDark : theme.text;

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: generateMsgId(),
      text: textToSend,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    scrollToBottom();

    setTimeout(() => {
      const response = getMockResponse(textToSend);
      const aiMsg: ChatMessage = {
        id: generateMsgId(),
        text: response.text,
        imageUrl: response.imageUrl,
        event: response.event,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
      scrollToBottom();
    }, 1200);
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isAi = item.sender === 'ai';
    if (isAi) {
      const { event, imageUrl } = item;
      return (
        <View style={{ width: '100%', marginVertical: Spacing.sm, gap: Spacing.xs }}>
          {item.text ? (
            <Text style={{ ...Typography.Paragraph2, lineHeight: 22, color: theme.text }}>
              {renderFormattedText(item.text, { color: theme.text }, { fontWeight: '700', color: theme.text })}
            </Text>
          ) : null}

          {event ? (
            <View style={{ marginTop: Spacing.md }}>
              <NewsCard
                title={event.title}
                date={event.date}
                image={imageUrl}
                author={event.location}
                onPress={() => {
                  router.back();
                  setTimeout(() => {
                    if (event.link) {
                      const isWeb = event.link.startsWith('http://') || event.link.startsWith('https://');
                      const isInternalDomain = event.link.includes('inside.ugal.ro');
                      if (isWeb && !isInternalDomain) {
                        Linking.openURL(event.link).catch(err => console.error("Couldn't open URL", err));
                      } else {
                        const resolved = resolveLink(event.link);
                        router.push(resolved as any);
                      }
                    } else {
                      router.push({
                        pathname: "/(public)/acasa/vizualizare",
                        params: {
                          type: "Eveniment",
                          title: event.title,
                          category: "Evenimente",
                          content: event.description,
                          image: imageUrl || "",
                          location: event.location,
                          date_start: "2026-05-24",
                          date_end: "2026-05-24",
                          time_start: "18:00",
                          time_end: "22:00",
                          date: event.date
                        }
                      });
                    }
                  }, 150);
                }}
              />
            </View>
          ) : imageUrl ? (
            <Image
              source={imageUrl}
              style={{
                width: '100%',
                height: 200,
                borderRadius: Spacing.sm,
                marginTop: Spacing.xs,
              }}
              contentFit="cover"
            />
          ) : null}
        </View>
      );
    } else {
      return <UserMessageBubble text={item.text} timestamp={item.timestamp} theme={theme} />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Main Content Container (relative wrapper for absolute floating input) */}
        <View style={{ flex: 1, position: 'relative' }}>
          {/* Messages List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            showsVerticalScrollIndicator={true}
            persistentScrollbar={true}
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: Spacing.lg,
              paddingTop: 72 + insets.top + Spacing.md,
              paddingBottom: Spacing.md,
              gap: Spacing.md,
              flexGrow: 1,
            }}
            ListEmptyComponent={null}
            ListFooterComponent={
              isTyping ? (
                <View style={{ width: '100%', marginVertical: Spacing.sm }}>
                  <View style={{ alignSelf: 'flex-start', paddingVertical: Spacing.xs }}>
                    <GradientSpinner />
                  </View>
                </View>
              ) : null
            }
          />

          {messages.length === 0 ? (
            <View
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: Spacing.lg,
                paddingBottom: keyboardVisible ? 40 : 120,
                gap: Spacing.md,
                pointerEvents: 'box-none',
              }}
            >
              <SparkleIcon
                width={48}
                height={48}
                style={{ marginBottom: Spacing.xs }}
              />
              <Text style={{ ...Typography.Heading3, color: theme.text, textAlign: 'center' }}>
                Cu ce te pot ajuta azi?
              </Text>
            </View>
          ) : null}

          {/* Bottom Area: Input only (Floating absolutely with transparent background) */}
          <ChatInput onSend={handleSend} theme={theme} themeWhite={themeWhite} />
        </View>

        {/* Header (borderless / no outline) - Positioned absolutely to overlay the scroll view */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: Spacing.lg,
            borderBottomWidth: 0, // removed outline
            height: 72 + insets.top,
            paddingTop: insets.top,
          }}
        >
          <LinearGradient
            colors={[theme.background, theme.background, theme.background + '00']}
            locations={[0, headerMiddleRatio, 1.0]}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: -50,
            }}
          />
          {Platform.OS === 'ios' ? (
            <Pressable
              onPress={handleClearChat}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              hitSlop={8}
            >
              <InteractiveGlass
                size={48}
                style={{
                  borderWidth: 1.5,
                  borderColor: themeWhite + '66',
                }}
              >
                <MessagePlusIcon width={22} height={22} color={theme.text} />
              </InteractiveGlass>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleClearChat}
              onPressIn={handlePressInClear}
              onPressOut={handlePressOutClear}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              hitSlop={8}
            >
              <Animated.View style={{ transform: [{ scale: scaleClearAnim }] }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1.5,
                    borderColor: themeWhite + '40',
                  }}
                >
                  <MessagePlusIcon width={22} height={22} color={theme.text} />
                </View>
              </Animated.View>
            </Pressable>
          )}

          {/* Title center */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: insets.top,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            pointerEvents="none"
          >
            <Text style={{ ...Typography.Heading3, color: theme.primary }}>Ace</Text>
          </View>

          {/* Action right (Close - Liquid Glass) */}
          {Platform.OS === 'ios' ? (
            <Pressable
              onPress={() => router.back()}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              hitSlop={8}
            >
              <InteractiveGlass
                size={48}
                style={{
                  borderWidth: 1.5,
                  borderColor: themeWhite + '66',
                }}
              >
                <CloseIcon width={22} height={22} color={theme.text} />
              </InteractiveGlass>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.back()}
              onPressIn={handlePressInClose}
              onPressOut={handlePressOutClose}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              hitSlop={8}
            >
              <Animated.View style={{ transform: [{ scale: scaleCloseAnim }] }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1.5,
                    borderColor: themeWhite + '40',
                  }}
                >
                  <CloseIcon width={22} height={22} color={theme.text} />
                </View>
              </Animated.View>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
