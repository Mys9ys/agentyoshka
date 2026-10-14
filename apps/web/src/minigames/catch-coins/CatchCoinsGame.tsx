import Phaser from 'phaser';
import { useEffect, useRef } from 'react';

const WIN_SCORE = 5;
/** Как в исходной сцене 360×400: монетка пересекает поле примерно за 1.8–2.6 с. */
const FALL_PX_PER_MS = 436 / 2200;

type CatchCoinsGameProps = {
  onWin: (score: number) => void;
  onClose: () => void;
};

export function CatchCoinsGame({ onWin, onClose }: CatchCoinsGameProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onWinRef = useRef(onWin);
  onWinRef.current = onWin;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const gameW = Math.max(280, host.clientWidth || 360);
    const gameH = Math.max(420, host.clientHeight || 560);

    class CatchScene extends Phaser.Scene {
      private score = 0;
      private scoreText!: Phaser.GameObjects.Text;
      private basket!: Phaser.GameObjects.Graphics;
      private won = false;
      private activeCoins: Phaser.GameObjects.Image[] = [];

      preload() {
        this.load.image('coin', '/art/icon-coin.png');
        this.load.image('room', '/art/home-bg.jpg');
      }

      create() {
        const room = this.add.image(gameW / 2, gameH / 2, 'room');
        const scale = Math.max(gameW / room.width, gameH / room.height);
        room.setScale(scale);
        this.add.rectangle(gameW / 2, gameH / 2, gameW, gameH, 0xfff6ea, 0.38);

        const hud = this.add.container(gameW / 2, 36);
        hud.add(this.add.image(-46, 0, 'coin').setDisplaySize(36, 36));
        this.scoreText = this.add
          .text(-22, 0, `0 / ${WIN_SCORE}`, {
            fontFamily: 'Comfortaa, Nunito, sans-serif',
            fontSize: '26px',
            color: '#3c2918',
          })
          .setOrigin(0, 0.5);
        hud.add(this.scoreText);
        hud.add(
          this.add
            .text(0, 32, 'Лови лапкой монетки', {
              fontFamily: 'Nunito, sans-serif',
              fontSize: '15px',
              color: '#8a6244',
            })
            .setOrigin(0.5, 0),
        );

        this.basket = this.add.graphics();
        this.basket.fillStyle(0xfffdf8, 1);
        this.basket.fillRoundedRect(-54, -18, 108, 36, 16);
        this.basket.lineStyle(4, 0xf08a3c, 1);
        this.basket.strokeRoundedRect(-54, -18, 108, 36, 16);
        this.basket.fillStyle(0xe8a317, 1);
        this.basket.fillRoundedRect(-34, -4, 68, 10, 5);
        this.basket.setPosition(gameW / 2, gameH - 48);

        this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
          if (this.won) return;
          this.basket.x = Phaser.Math.Clamp(p.x, 58, gameW - 58);
        });

        this.time.addEvent({
          delay: 700,
          loop: true,
          callback: () => {
            if (this.won) return;
            const coin = this.add.image(
              Phaser.Math.Between(28, gameW - 28),
              -24,
              'coin',
            );
            coin.setDisplaySize(44, 44);
            this.activeCoins.push(coin);
            const distance = gameH + 54;
            this.tweens.add({
              targets: coin,
              y: gameH + 30,
              duration: distance / FALL_PX_PER_MS * Phaser.Math.FloatBetween(0.82, 1.18),
              onComplete: () => {
                this.activeCoins = this.activeCoins.filter((c) => c !== coin);
                coin.destroy();
              },
            });
          },
        });
      }

      update() {
        if (this.won) return;

        for (let i = this.activeCoins.length - 1; i >= 0; i--) {
          const coin = this.activeCoins[i]!;
          if (!coin.active) continue;

          const caught =
            Math.abs(coin.x - this.basket.x) < 48 &&
            Math.abs(coin.y - this.basket.y) < 22;

          if (caught) {
            this.tweens.killTweensOf(coin);
            coin.destroy();
            this.activeCoins.splice(i, 1);
            this.score += 1;
            this.scoreText.setText(`${this.score} / ${WIN_SCORE}`);

            if (this.score >= WIN_SCORE) {
              this.won = true;
              const banner = this.add.graphics();
              banner.fillStyle(0xfffdf8, 0.96);
              banner.fillRoundedRect(gameW / 2 - 110, gameH / 2 - 36, 220, 72, 24);
              banner.lineStyle(3, 0xf0d4b0, 1);
              banner.strokeRoundedRect(gameW / 2 - 110, gameH / 2 - 36, 220, 72, 24);
              this.add
                .text(gameW / 2, gameH / 2, 'Отлично!', {
                  fontFamily: 'Comfortaa, Nunito, sans-serif',
                  fontSize: '32px',
                  color: '#2f9d62',
                })
                .setOrigin(0.5);
              this.time.delayedCall(600, () => onWinRef.current(this.score));
            }
          }
        }
      }
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: gameW,
      height: gameH,
      parent: host,
      backgroundColor: '#fff6ea',
      scene: CatchScene,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    });

    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-cream px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto mb-3 flex w-full max-w-md items-center justify-between">
        <h2 className="font-display text-[1.65rem] leading-none text-ink">Поймай монетку</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-line bg-paper px-3 py-2 text-sm font-bold text-ink shadow-soft"
        >
          Закрыть
        </button>
      </div>
      <div
        ref={hostRef}
        className="mx-auto w-full max-w-md flex-1 overflow-hidden rounded-card border border-line bg-paper shadow-card"
      />
    </div>
  );
}
