// Widget-ul ACE pentru WEB (DOAR web — Metro alege acest fisier in locul lui
// `ace.tsx` cand bundle-ul e pentru web; mobilul ramane neatins).
//
// Pe mobil, ACE e un buton flotant care impinge spre un ecran full-screen (/ace).
// Pe web preferam un "chat widget" clasic: o bulina flotanta jos-dreapta care, la
// click, deschide un panou de chat ancorat in colt. Panoul e montat in
// `_layout.web.tsx`, deci ramane montat la navigarea intre paginile (public) =>
// conversatia persista ("sticky").
//
// Raspunsurile vin in streaming (token cu token) de la backend prin `@/services/ace-stream`.
import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Animated,
  Easing,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, ColorScheme } from '@/constants/theme';
import { Typography } from '@/constants/typography';
import { NewsCard } from '@/components/ui/display/news-card';
import { streamAce } from '@/services/ace-stream';

import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

import CloseIcon from '@/assets/icons/svg/x.svg';
import MessagePlusIcon from '@/assets/icons/svg/message-plus.svg';
import SendIcon from '@/assets/icons/svg/send.svg';
import SparkleIcon from '@/assets/icons/svg/message-circle-star.svg';

// Tipul unui mesaj din chat + generator de id. Definite local: widget-ul nu mai
// depinde de `ace-responses` (modul eliminat din proiect).
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
    description?: string;
    link?: string;
  };
}

function generateMsgId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const FAB_SIZE = 60;
const PANEL_MAX_WIDTH = 384;
const PANEL_MAX_HEIGHT = 560;

// Imparte textul pe "**" si ingroasa portiunile dintre delimitatori (markdown simplu).
function renderFormattedText(text: string, baseStyle: any, boldStyle: any) {
  const parts = text.split('**');
  return parts.map((part, index) => {
    const isBold = index % 2 === 1;
    return (
      <Text key={index} style={isBold ? boldStyle : baseStyle}>
        {part}
      </Text>
    );
  });
}

function GradientSpinner() {
  const [rotate] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(rotate, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: false })
    );
    anim.start();
    return () => anim.stop();
  }, [rotate]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{ width: 24, height: 24, transform: [{ rotate: spin }] }}>
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Defs>
          <SvgLinearGradient id="ace-grad-web" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#3476d6" />
            <Stop offset="30%" stopColor="#5861b8" />
            <Stop offset="65%" stopColor="#742d73" />
            <Stop offset="100%" stopColor="#dc1647" />
          </SvgLinearGradient>
        </Defs>
        <Circle cx={12} cy={12} r={9} stroke="url(#ace-grad-web)" strokeWidth={3} strokeLinecap="round" strokeDasharray="40 16" />
      </Svg>
    </Animated.View>
  );
}

export function Ace() {
  const theme = useTheme();
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  // Functia de oprire a stream-ului curent (pentru cleanup / anulare).
  const streamStopRef = useRef<null | (() => void)>(null);

  // La demontarea componentei, inchidem orice stream activ (evitam scurgeri).
  useEffect(() => {
    return () => streamStopRef.current?.();
  }, []);

  // Dimensiuni responsive: pe ecrane inguste panoul aproape umple latimea.
  const panelWidth = Math.min(PANEL_MAX_WIDTH, width - Spacing.xl3);
  const panelHeight = Math.min(PANEL_MAX_HEIGHT, height - FAB_SIZE - Spacing.xl4 - Spacing.xl3);
  const innerWidth = panelWidth - Spacing.lg * 2;

  // Animatia de deschidere a panoului (fade + slide + scale dinspre coltul de jos).
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, anim]);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const handleSend = () => {
    const textToSend = inputText.trim();
    if (!textToSend) return;

    // Daca un raspuns inca curge, il oprim inainte de a porni altul.
    streamStopRef.current?.();

    const userMsg: ChatMessage = {
      id: generateMsgId(),
      text: textToSend,
      sender: 'user',
      timestamp: new Date(),
    };

    // Istoricul trimis backend-ului = mesajele de pana acum (rol + text).
    const history = messages.map((m) => ({
      role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.text,
    }));

    // Adaugam mesajul userului + un mesaj AI GOL, care se umple progresiv din tokeni.
    const aiMsgId = generateMsgId();
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: aiMsgId, text: '', sender: 'ai', timestamp: new Date() },
    ]);
    setInputText('');
    setIsTyping(true);
    scrollToBottom();

    const appendToAi = (chunk: string) =>
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, text: m.text + chunk } : m))
      );

    streamStopRef.current = streamAce(textToSend, history, {
      onToken: (chunk) => {
        setIsTyping(false);
        appendToAi(chunk);
        scrollToBottom();
      },
      onDone: () => {
        setIsTyping(false);
        streamStopRef.current = null;
        // Daca stream-ul s-a terminat fara niciun token, raspunsul a venit gol de la
        // server (LLM jos / fara output) — aratam un mesaj in loc de o bula goala.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId && !m.text
              ? { ...m, text: '⚠️ Asistentul nu a returnat niciun răspuns. Încearcă din nou mai târziu.' }
              : m
          )
        );
        scrollToBottom();
      },
      onError: (msg) => {
        setIsTyping(false);
        streamStopRef.current = null;
        // Daca a venit deja text partial, atasam eroarea la final; altfel doar eroarea.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? { ...m, text: m.text ? `${m.text}\n\n⚠️ ${msg}` : `⚠️ ${msg}` }
              : m
          )
        );
        scrollToBottom();
      },
    });
  };

  const handleClearChat = () => {
    streamStopRef.current?.();
    streamStopRef.current = null;
    setIsTyping(false);
    setMessages([]);
  };

  // Navigheaza la destinatia unui card de eveniment/anunt din raspuns, apoi inchide
  // widget-ul ca utilizatorul sa vada pagina.
  const handleEventPress = (item: ChatMessage) => {
    const { event, imageUrl } = item;
    if (!event) return;
    setOpen(false);

    if (event.link) {
      const isWeb = event.link.startsWith('http://') || event.link.startsWith('https://');
      const isInternalDomain = event.link.includes('inside.ugal.ro');
      if (isWeb && !isInternalDomain) {
        Linking.openURL(event.link).catch((err) => console.error("Couldn't open URL", err));
        return;
      }
      router.push(event.link as any);
      return;
    }

    router.push({
      pathname: '/(public)/acasa/vizualizare',
      params: {
        type: 'Eveniment',
        title: event.title,
        category: 'Evenimente',
        content: event.description,
        image: imageUrl || '',
        location: event.location,
        date_start: '2026-05-24',
        date_end: '2026-05-24',
        time_start: '18:00',
        time_end: '22:00',
        date: event.date,
      },
    });
  };

  const themeWhite = theme.textOnDark === ColorScheme.white ? theme.textOnDark : theme.text;

  const renderMessage = (item: ChatMessage) => {
    if (item.sender === 'user') {
      return (
        <View key={item.id} style={{ alignSelf: 'flex-end', maxWidth: '85%', marginVertical: Spacing.xs }}>
          <View
            style={{
              borderRadius: Spacing.md,
              borderBottomRightRadius: 4,
              paddingVertical: Spacing.sm,
              paddingHorizontal: Spacing.lg,
              backgroundColor: theme.primary,
            }}
          >
            <Text style={{ ...Typography.Paragraph3, lineHeight: 20, color: ColorScheme.white }}>
              {renderFormattedText(
                item.text,
                { color: ColorScheme.white },
                { fontWeight: '700', color: ColorScheme.white }
              )}
            </Text>
          </View>
        </View>
      );
    }

    const { event, imageUrl } = item;
    return (
      <View key={item.id} style={{ width: '100%', marginVertical: Spacing.sm, gap: Spacing.xs }}>
        {item.text ? (
          <Text style={{ ...Typography.Paragraph3, lineHeight: 20, color: theme.text }}>
            {renderFormattedText(item.text, { color: theme.text }, { fontWeight: '700', color: theme.text })}
          </Text>
        ) : null}

        {event ? (
          <View style={{ marginTop: Spacing.xs }}>
            <NewsCard
              variant="list"
              width={innerWidth}
              title={event.title}
              date={event.date}
              image={imageUrl}
              author={event.location}
              onPress={() => handleEventPress(item)}
            />
          </View>
        ) : imageUrl ? (
          <Image
            source={imageUrl}
            style={{ width: '100%', height: 160, borderRadius: Spacing.sm, marginTop: Spacing.xs }}
            contentFit="cover"
          />
        ) : null}
      </View>
    );
  };

  return (
    <View
      style={{ position: 'absolute', right: Spacing.xxl, bottom: Spacing.xxl, zIndex: 1000, alignItems: 'flex-end' }}
      pointerEvents="box-none"
    >
      {/* Panoul de chat (ancorat deasupra bulinei). Ramane montat; il ascundem cu
          opacity/pointerEvents ca sa nu blocheze click-urile cand e inchis. */}
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          bottom: FAB_SIZE + Spacing.md,
          right: 0,
          width: panelWidth,
          height: panelHeight,
          borderRadius: Spacing.xl,
          backgroundColor: theme.background,
          borderWidth: 1,
          borderColor: theme.border + '55',
          overflow: 'hidden',
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          ],
          shadowColor: ColorScheme.pureBlack,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.18,
          shadowRadius: 28,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: Spacing.lg,
            paddingVertical: Spacing.md,
            backgroundColor: theme.card,
            borderBottomWidth: 1,
            borderBottomColor: theme.border + '40',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <SparkleIcon width={24} height={24} color={theme.primary} />
            <View>
              <Text style={{ ...Typography.Heading5, color: theme.primary }}>Ace</Text>
              <Text style={{ ...Typography.Small2, color: theme.textSecondary }}>Asistent virtual</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
            <Pressable
              onPress={handleClearChat}
              accessibilityRole="button"
              accessibilityLabel="Conversație nouă"
              hitSlop={8}
              style={({ pressed }: any) => ({ opacity: pressed ? 0.6 : 1, padding: Spacing.xs })}
            >
              <MessagePlusIcon width={20} height={20} color={theme.text} />
            </Pressable>
            <Pressable
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Închide chat-ul"
              hitSlop={8}
              style={({ pressed }: any) => ({ opacity: pressed ? 0.6 : 1, padding: Spacing.xs })}
            >
              <CloseIcon width={20} height={20} color={theme.text} />
            </Pressable>
          </View>
        </View>

        {/* Lista de mesaje */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingTop: Spacing.md,
            paddingBottom: Spacing.md,
            flexGrow: 1,
          }}
        >
          {messages.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl4 }}>
              <SparkleIcon width={40} height={40} color={theme.primary} />
              <Text style={{ ...Typography.Heading5, color: theme.text, textAlign: 'center' }}>
                Cu ce te pot ajuta azi?
              </Text>
              <Text style={{ ...Typography.Paragraph4, color: theme.textSecondary, textAlign: 'center' }}>
                Întreabă-mă despre evenimente, cantină, hartă sau sesizări.
              </Text>
            </View>
          ) : (
            messages.map(renderMessage)
          )}

          {isTyping ? <GradientSpinner /> : null}
        </ScrollView>

        {/* Input */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.sm,
            backgroundColor: theme.card,
            borderTopWidth: 1,
            borderTopColor: theme.border + '40',
          }}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Pune o întrebare..."
            placeholderTextColor={theme.textSecondary}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            style={{
              flex: 1,
              height: 44,
              paddingHorizontal: Spacing.lg,
              borderRadius: 22,
              backgroundColor: theme.background,
              borderWidth: 1,
              borderColor: theme.border + '55',
              ...Typography.Paragraph3,
              color: theme.text,
              // outline-ul nativ de focus al browserului nu se potriveste cu designul
              ...({ outlineStyle: 'none' } as any),
            }}
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim()}
            accessibilityRole="button"
            accessibilityLabel="Trimite mesajul"
            style={({ pressed }: any) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: inputText.trim() ? theme.primary : theme.border + '40',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <SendIcon width={18} height={18} color={inputText.trim() ? themeWhite : theme.textSecondary} />
          </Pressable>
        </View>
      </Animated.View>

      {/* Bulina flotanta. Sparkle cand e inchis, X cand e deschis. */}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={open ? 'Închide asistentul Ace' : 'Deschide asistentul Ace'}
        style={({ pressed }: any) => ({
          width: FAB_SIZE,
          height: FAB_SIZE,
          borderRadius: FAB_SIZE / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border + '40',
          transform: [{ scale: pressed ? 0.94 : 1 }],
          shadowColor: ColorScheme.pureBlack,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.22,
          shadowRadius: 12,
        })}
      >
        {open ? (
          <CloseIcon width={26} height={26} color={theme.primary} />
        ) : (
          <SparkleIcon width={34} height={34} color={theme.primary} />
        )}
      </Pressable>
    </View>
  );
}
