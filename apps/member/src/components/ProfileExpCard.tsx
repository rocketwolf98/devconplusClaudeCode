import { motion } from 'framer-motion'
import { usePointsStore } from '../stores/usePointsStore'

const imgSolarMedalStarCircleBoldDuotone = "https://www.figma.com/api/mcp/asset/04489665-76af-4996-94c5-2fd03ef88f72";
const imgSolarBoltBroken = "https://www.figma.com/api/mcp/asset/830e7e23-553e-4fe6-bc43-31e9a7a08703";

export default function ProfileExpCard() {
  const { spendablePoints, lifetimePoints, tierProgress } = usePointsStore()

  return (
    <div className="bg-white rounded-[24px] border border-slate-400/30 p-[24px] flex flex-col gap-5 shadow-card">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="relative shrink-0 size-[48px]">
            <img src={imgSolarMedalStarCircleBoldDuotone} alt="Medal" className="absolute block inset-0 max-w-none size-full" />
          </div>
          <p className="font-proxima leading-none text-[#464646] tracking-[-1.226px]">
            <span className="font-extrabold text-[40.867px]">{spendablePoints.toLocaleString()}</span>
            {' '}
            <span className="font-semibold text-[24px]">XP</span>
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative shrink-0 size-[16px]">
              <img src={imgSolarBoltBroken} alt="Points" className="absolute block inset-0 max-w-none size-full" />
            </div>
            <span className="font-proxima text-[14px] text-[#6b7280]">
              {lifetimePoints.toLocaleString()} lifetime points
            </span>
          </div>

          <div className="relative w-full h-2 bg-black/[0.16] rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ backgroundColor: '#eab308' }}
              initial={{ width: 0 }}
              animate={{ width: `${tierProgress}%` }}
              transition={{ 
                type: 'spring',
                stiffness: 50,
                damping: 20,
                restDelta: 0.001
              }}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 w-full h-full"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                }}
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
