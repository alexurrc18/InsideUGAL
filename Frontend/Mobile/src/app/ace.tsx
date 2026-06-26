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
  Linking,
} from 'react-native';
import Animated, { useSharedValue, withSpring, withTiming, withRepeat, useAnimatedStyle, cancelAnimation, Easing } from 'react-native-reanimated';
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
import { getMockResponse, resolveLink, generateMsgId, type ChatMessage } from '@/constants/ace-responses';

import CloseIcon from '@/assets/icons/svg/x.svg';
import MessagePlusIcon from '@/assets/icons/svg/message-plus.svg';
import SendIcon from '@/assets/icons/svg/send.svg';
import SparkleIcon from '@/assets/icons/svg/message-circle-star.svg';

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
  const bottomPad = useSharedValue(Math.max(insets.bottom, Spacing.md));
  const padStyle = useAnimatedStyle(() => ({ paddingBottom: bottomPad.value }));
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        bottomPad.set(withTiming(Spacing.sm, { duration: 250 }));
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        bottomPad.set(withTiming(Math.max(insets.bottom, Spacing.md), { duration: 250 }));
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [bottomPad, insets.bottom]);

  const handleSendPress = () => {
    if (!inputText.trim()) return;
    onSend(inputText);
    setInputText('');
  };

  const isTextEmpty = !inputText.trim();

  return (
    <Animated.View
      style={[
        {
          width: '100%',
          paddingHorizontal: Spacing.lg,
          paddingTop: Spacing.sm,
          gap: Spacing.sm,
          backgroundColor: 'transparent',
        },
        padStyle,
      ]}
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
    </Animated.View>
  );
}

function GradientSpinner() {
  const rotate = useSharedValue(0);

  useEffect(() => {
    rotate.set(withRepeat(withTiming(1, { duration: 1000, easing: Easing.linear }), -1));
    return () => cancelAnimation(rotate);
  }, [rotate]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value * 360}deg` }],
  }));

  return (
    <Animated.View style={[spinStyle, { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }]}>
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

  const scaleClearAnim = useSharedValue(1);
  const scaleClearStyle = useAnimatedStyle(() => ({ transform: [{ scale: scaleClearAnim.value }] }));
  const scaleCloseAnim = useSharedValue(1);
  const scaleCloseStyle = useAnimatedStyle(() => ({ transform: [{ scale: scaleCloseAnim.value }] }));

  const handlePressInClear = () => {
    scaleClearAnim.set(withSpring(1.12, { stiffness: 300, damping: 15, mass: 0.5 }));
  };

  const handlePressOutClear = () => {
    scaleClearAnim.set(withSpring(1.0, { stiffness: 300, damping: 15, mass: 0.5 }));
  };

  const handlePressInClose = () => {
    scaleCloseAnim.set(withSpring(1.12, { stiffness: 300, damping: 15, mass: 0.5 }));
  };

  const handlePressOutClose = () => {
    scaleCloseAnim.set(withSpring(1.0, { stiffness: 300, damping: 15, mass: 0.5 }));
  };

  const emptyStatePad = useSharedValue(120);
  const emptyStatePadStyle = useAnimatedStyle(() => ({ paddingBottom: emptyStatePad.value }));

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        emptyStatePad.set(withTiming(40, { duration: 250 }));
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        emptyStatePad.set(withTiming(120, { duration: 250 }));
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [emptyStatePad]);

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
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  right: 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: Spacing.lg,
                  gap: Spacing.md,
                  pointerEvents: 'box-none',
                },
                emptyStatePadStyle,
              ]}
            >
              <SparkleIcon
                width={48}
                height={48}
                style={{ marginBottom: Spacing.xs }}
              />
              <Text style={{ ...Typography.Heading3, color: theme.text, textAlign: 'center' }}>
                Cu ce te pot ajuta azi?
              </Text>
            </Animated.View>
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
              <Animated.View style={scaleClearStyle}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.primary,
                  }}
                >
                  <MessagePlusIcon width={22} height={22} color="#FFFFFF" />
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
              <Animated.View style={scaleCloseStyle}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.primary,
                  }}
                >
                  <CloseIcon width={22} height={22} color="#FFFFFF" />
                </View>
              </Animated.View>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
