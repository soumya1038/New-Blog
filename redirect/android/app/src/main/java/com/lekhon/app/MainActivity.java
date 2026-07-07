package com.lekhon.app;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private TextToSpeech textToSpeech;
    private volatile boolean textToSpeechReady = false;
    private final Map<String, UtteranceMeta> utteranceMetaMap = new ConcurrentHashMap<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            webView.addJavascriptInterface(new LekhonTextToSpeechBridge(), "LekhonAndroidTts");
        }

        textToSpeech = new TextToSpeech(this, status -> {
            textToSpeechReady = status == TextToSpeech.SUCCESS;
            TextToSpeech engine = textToSpeech;
            if (textToSpeechReady && engine != null) {
                engine.setLanguage(Locale.getDefault());
            }
        });
        textToSpeech.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override
            public void onStart(String utteranceId) {
                emitTextToSpeechEvent("start", utteranceId, null);
            }

            @Override
            public void onDone(String utteranceId) {
                emitTextToSpeechEvent("done", utteranceId, null);
                utteranceMetaMap.remove(utteranceId);
            }

            @Override
            public void onError(String utteranceId) {
                emitTextToSpeechEvent("error", utteranceId, "tts_error");
                utteranceMetaMap.remove(utteranceId);
            }

            @Override
            public void onError(String utteranceId, int errorCode) {
                emitTextToSpeechEvent("error", utteranceId, "tts_error_" + errorCode);
                utteranceMetaMap.remove(utteranceId);
            }
        });
    }

    @Override
    protected void onDestroy() {
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
            textToSpeech = null;
        }
        super.onDestroy();
    }

    private void emitTextToSpeechEvent(String type, String utteranceId, String error) {
        UtteranceMeta meta = utteranceMetaMap.get(utteranceId);
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (meta == null || webView == null) {
            return;
        }

        try {
            JSONObject detail = new JSONObject();
            detail.put("type", type);
            detail.put("runId", meta.runId);
            detail.put("sentenceIndex", meta.sentenceIndex);
            if (error != null) {
                detail.put("error", error);
            }

            String detailJson = detail.toString();
            String script = "(function(){var detail=" + detailJson + ";var event;"
                    + "if(typeof CustomEvent==='function'){event=new CustomEvent('lekhonAndroidTts',{detail:detail});}"
                    + "else{event=document.createEvent('CustomEvent');event.initCustomEvent('lekhonAndroidTts',false,false,detail);}"
                    + "window.dispatchEvent(event);})();";
            webView.post(() -> webView.evaluateJavascript(script, null));
        } catch (Exception ignored) {
            // TTS events are best-effort; speech should not crash the app.
        }
    }

    private static class UtteranceMeta {
        final int sentenceIndex;
        final String runId;

        UtteranceMeta(int sentenceIndex, String runId) {
            this.sentenceIndex = sentenceIndex;
            this.runId = runId;
        }
    }

    private class LekhonTextToSpeechBridge {
        @JavascriptInterface
        public boolean isReady() {
            return textToSpeechReady;
        }

        @JavascriptInterface
        public void stop() {
            runOnUiThread(() -> {
                if (textToSpeech != null) {
                    textToSpeech.stop();
                }
            });
        }

        @JavascriptInterface
        public void speak(String text, int sentenceIndex, String runId, float rate, float pitch, float volume) {
            if (text == null || text.trim().isEmpty()) {
                return;
            }

            runOnUiThread(() -> {
                if (textToSpeech == null || !textToSpeechReady) {
                    String failedUtteranceId = "shorts-tts-failed-" + System.nanoTime();
                    utteranceMetaMap.put(failedUtteranceId, new UtteranceMeta(sentenceIndex, runId));
                    emitTextToSpeechEvent("error", failedUtteranceId, "tts_not_ready");
                    utteranceMetaMap.remove(failedUtteranceId);
                    return;
                }

                String utteranceId = "shorts-tts-" + sentenceIndex + "-" + System.nanoTime();
                utteranceMetaMap.put(utteranceId, new UtteranceMeta(sentenceIndex, runId));
                Bundle params = new Bundle();
                params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, Math.max(0f, Math.min(volume, 1f)));
                textToSpeech.setSpeechRate(Math.max(0.5f, Math.min(rate, 2f)));
                textToSpeech.setPitch(Math.max(0.5f, Math.min(pitch, 2f)));
                textToSpeech.speak(text.trim(), TextToSpeech.QUEUE_FLUSH, params, utteranceId);
            });
        }
    }
}
