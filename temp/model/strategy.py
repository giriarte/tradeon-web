import typing as t
from abc import ABC, abstractmethod
from indicators.indicator import Indicator
from strategies.position import Position

Dictionary = t.Dict[str, t.Dict[str, t.Any]] # Represents the default parameters map

class TradeStrategy:

    def __init__(self,
                  name: str,
                  baseIndicators: t.List[Indicator],
                  categoryAPosition: Position,
                  brokerId: str,
                  symbols: t.List[str],
                  candleInterval: str,
                  strategyId: str = None,
                  userId: str = None,
                  cooldownInterval: int = None):
        self.name = name
        self.baseIndicators = baseIndicators
        self.categoryAPosition = categoryAPosition
        self.brokerId = brokerId
        self.symbols = symbols
        self.candleInterval = candleInterval
        self.strategyId = strategyId
        self.userId = userId
        self.cooldownInterval = cooldownInterval

    """
    Interface for a trading strategy, defining the required attributes and methods
    to be implemented by any concrete strategy (strategies can be formed by one or more indicators).
    """
    
    # --- ATTRIBUTES (Class Variables or Properties for definition) ---
    name: str

    # Lists of Indicators
    baseIndicators: t.List[Indicator] = [] # Indicators here are mandatory conditions to generate a position
    enhancers: t.List[Indicator] = [] # Enhancers indicators can increase the position category
    weakeners: t.List[Indicator] = [] # weakeners indicators can decrease the position category
    
    # Trade Positions/Signals
    categoryAPosition: Position # This is the category with the biggest return ratio (more agressive position)
    categoryBPosition: Position # medium return reward ratio (medium agressivity)
    categoryCPosition: Position # small reward ratio (more conservative position)
    
    # Market/Data Configuration
    brokerId: str
    symbols: t.List[str] = [] # The coin pairs to which this strategy will apply
    candleInterval: str  # Represents the data interval (e.g., 1 day).
    cooldownInterval: int  # Minimum interval (in minutes) between consecutive trades.

    def evaluate(self, data: t.Any, params: t.Optional[Dictionary] = None) -> t.Optional[Position]:
        """
        Evaluates the strategy based on the agreement of all base indicators.
        
        Returns:
            self.categoryAPosition (Position or None): 
                - If ALL base indicators return the same non-zero signal.
                - None, otherwise (if signals conflict or all are 0).
        """
        
        # 1. Handle the case where there are no mandatory indicators
        if not self.baseIndicators:
            # If no mandatory conditions exist, we can't meet the "all agree" requirement.
            return None 

        # 2. Collect all signals from the base indicators
        signals = []
        for indicator in self.baseIndicators:
            # Call the indicator's evaluate method, passing data and parameters
            # The indicator must return an integer signal (0, 1, 2)
            # We also need to consider the offset if defined
            offset = indicator.offset if indicator.offset is not None else 0
            end_index = int(len(data)-offset) if len(data)-offset > 0 else len(data)
            evaluation_data = data.iloc[0:end_index]
            signal = indicator.evaluate(evaluation_data, params)
            signals.append(signal)

        # 3. Check for the required conditions
        
        # Check 3a: Is the list of signals empty or do all signals agree?
        # A set with one element means all signals are identical (e.g., {1} or {2})
        unique_signals = set(signals)
        
        if len(unique_signals) == 1:
            # Check 3b: Is the single unique signal non-zero?
            agreed_signal = unique_signals.pop()
            
            if agreed_signal != 0:
                # All mandatory conditions are met and agree on a trade (Buy/Sell)
                self.categoryAPosition.type = int(agreed_signal)
                return self.categoryAPosition
        
        # 4. If signals conflict, or if the agreed signal is 0 (Hold), return None
        return None